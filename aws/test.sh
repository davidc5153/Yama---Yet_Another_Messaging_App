#!/bin/bash
# Script for AWS lambda automated testing

# *********************************
# ********** FUNCTIONS ************
# *********************************

# Define a timestamp function
timestamp() {
  date +"%Y-%m-%d_%H-%M-%S" # current time
}

# Define test function
test() {
  title=$1
  command=$2
  expectedStatus=$3
  expectedBody=$4
  event=$5

  if [ $event ]; then
    echo "event = $event"
    echo "command = $command"
    json=$(echo $event | $command)
  else
    json=$($command)
  fi

  status=$(jq '.statusCode' <<< "$json")
  body=$(jq '.body' <<< "$json")

  echo -e "\n\n*************** $title ***************"
  echo "*************** $title ***************" >> "result.log"
  
  passed=true

  # Check status
  if [ "$expectedStatus" -eq "$status" ]; then
    echo "PASSED (status=$expectedStatus)"    
    echo "PASSED: status=$expectedStatus" >> "result.log"
  else 
    echo "#######################################"
    echo "########### Test FAILED ###############"
    echo "# Expected: status=$expectedStatus"
    echo "# Received: status=$status"
    echo "#######################################"

    echo "# FAILED: Expected status=$expectedStatus, received status=$status" >> "result.log"
    passed=false
  fi

  # Check body
 if [[ "$body" == *"$expectedBody"* ]]; then
    echo "PASSED: (body=$expectedBody)"    
    echo "PASSED: body=$expectedBody" >> "result.log"
    # Extract token if required - Need it later for further tests
    if [[ "$expectedBody" == "623bb78e3cb41fb72c936df3" && "$body" == *'\"token\"'* ]]; then
      bodyjson=$(jq '.body | fromjson' <<< "$json")
      bodyresult=$(jq '.result' <<< "$bodyjson")
      echo $(jq -r '.token' <<< $bodyresult) > ".token"
    fi
  else 
    echo "#######################################"
    echo "########### Test FAILED ###############"
    echo "# Expected: body=$expectedBody"
    echo "# Received: body=$body"
    echo "#######################################"

    echo "# FAILED: Expected body=$expectedBody, received body=$body" >> "result.log"
    passed=false
  fi

  # Passed
  if [ "$passed" = true ]; then
    echo "............ Test PASSED ..........."
  else
    echo "########### Test FAILED ###############"
  fi
}

# *********************************
# ********** AWS TESTS ************
# *********************************

title="\n\n***********************************************\n********** TEST: $(timestamp) **********\n***********************************************\n\n" 
echo -e $title
echo -e $title >> "result.log"

# : <<'END1'

# Just a test call to test GET lambda 
sudo sam local invoke "TestGetTest" -e tests/test.json

# (1) USER/POST/LOGIN
echo -e "\n\n(1) ****************** USER/POST/LOGIN ******************\n\n"
# (1.1) Login using email
result=$(test '1.1' 'sudo sam local invoke UserPostLogin -e tests/user/post/login-email.json' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (1.2) Login using username
result=$(test '1.2' 'sudo sam local invoke UserPostLogin -e tests/user/post/login-username.json' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"

# (2) USER/POST/REGISTER
echo -e "\n\n(2) ****************** USER/POST/REGISTER ******************\n\n"
# (2.1) Duplicate registration
result=$(test '2.1' 'sudo sam local invoke UserPostRegister -e tests/user/post/register-duplicate.json' 401 'already exists')
echo -e "$result \n\n"
# (2.2) Invalid password
event='{"body":"{\"username\":\"'$(timestamp)'\",\"email\":\"'$(timestamp)'@test.com\",\"phone\":\"0410123456\",\"name\":\"Name\",\"public\":true,\"dob\":\"2000-01-01\",\"password\":\"password\"}"}'
result=$(test '2.2'  'sudo sam local invoke UserPostRegister --event - ' 401 'Invalid password' $event)
echo -e "$result \n\n"
# (2.3) Valid registration
event='{"body":"{\"username\":\"'$(timestamp)'\",\"email\":\"'$(timestamp)'@test.com\",\"phone\":\"0410123456\",\"name\":\"Name\",\"public\":true,\"dob\":\"2000-01-01\",\"password\":\"Test123456@\"}"}'
result=$(test '2.3'  'sudo sam local invoke UserPostRegister --event - ' 200 '_id' $event)
echo -e "$result \n\n"
# (2.4) Valid registration - 8 characters
event='{"body":"{\"username\":\"'$(timestamp)'\",\"email\":\"'$(timestamp)'@test.com\",\"phone\":\"0410123456\",\"name\":\"Name\",\"public\":true,\"dob\":\"2000-01-01\",\"password\":\"@Pa55wrd\"}"}'
result=$(test '2.4'  'sudo sam local invoke UserPostRegister --event - ' 200 '_id' $event)
echo -e "$result \n\n"
# (2.5) Invalid password - 7 characters
event='{"body":"{\"username\":\"'$(timestamp)'\",\"email\":\"'$(timestamp)'@test.com\",\"phone\":\"0410123456\",\"name\":\"Name\",\"public\":true,\"dob\":\"2000-01-01\",\"password\":\"@Pa55wd\"}"}'
result=$(test '2.5'  'sudo sam local invoke UserPostRegister --event - ' 401 'Invalid password' $event)
echo -e "$result \n\n"
# (2.6) Registration with failing password: Refer BUG-password-backend branch
event='{"body":"{\"username\":\"'$(timestamp)'\",\"email\":\"'$(timestamp)'@test-users.com\",\"phone\":\"12345\",\"name\":\"test-user\",\"public\":true,\"dob\":\"2000-01-01\",\"password\":\"Test-Password-1\"}"}'
result=$(test '2.6'  'sudo sam local invoke UserPostRegister --event - ' 200 '_id' $event)
echo -e "$result \n\n"

# (3) USER/GET/EXISTS
echo -e "\n\n(3) ****************** USER/GET/EXISTS ******************\n\n"
# (3.1) Find user with username
result=$(test '3.1' 'sudo sam local invoke UserGetExists -e tests/user/get/exists-username.json' 200 'true')
echo -e "$result \n\n"
# (3.2) Find user with email
result=$(test '3.2' 'sudo sam local invoke UserGetExists -e tests/user/get/exists-email.json' 200 'true')
echo -e "$result \n\n"
# (3.3) No user found with passed username
result=$(test '3.3' 'sudo sam local invoke UserGetExists -e tests/user/get/exists-notfound.json' 200 'false')
echo -e "$result \n\n"

# END1

# Read in the current valid token
YAMA_TOKEN=$(<.token)

# : <<'END2'

# (4) CHANNEL/POST/CREATE
echo -e "\n\n(4) ****************** CHANNEL/POST/CREATE ******************\n\n"
# (4.1) Try and create a channel with a duplicate name within the same group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"test\",\"group\":\"6243be61247839960ce66347\"}"}'
echo $event > ".event" # Create json event file to pass to SAM (Must be a file - Would not accept the <space> that is Required after "Bearer" in the header) 
result=$(test '4.1'  'sudo sam local invoke ChannelPostCreate -e .event' 401 'Channel name already exists')
echo -e "$result \n\n"
# (4.2) Create a new channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"'$(timestamp)'\",\"group\":\"6243be61247839960ce66347\"}"}'
echo $event > ".event" # Create json event file to pass to SAM (Must be a file - Would not accept the <space> that is Required after "Bearer" in the header) 
result=$(test '4.2'  'sudo sam local invoke ChannelPostCreate -e .event' 200 '_id')
echo -e "$result \n\n"

# (5) GROUP/GET/INFO
echo -e "\n\n(5) ****************** GROUP/GET/INFO ******************\n\n"
# (5.1) Try and get the information of the test group 
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"group":"6243be61247839960ce66347"}}'
echo $event > ".event" # Create json event file 
result=$(test '5.1'  'sudo sam local invoke GroupGetInfo -e .event' 200 '_id')
echo -e "$result \n\n"
# (5.2) Try and get the information of all groups for the user 
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"}}'
echo $event > ".event" # Create json event file 
result=$(test '5.2'  'sudo sam local invoke GroupGetInfo -e .event' 200 '_id')
echo -e "$result \n\n"

# (6) GROUP/GET/INFO
echo -e "\n\n(6) ****************** CHANNEL/GET/INFO ******************\n\n"
# (6.1) Try and get the information of the test channel 
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"channel":"6243bfd0247839960ce66349"}}'
echo $event > ".event" # Create json event file 
result=$(test '6.1'  'sudo sam local invoke ChannelGetInfo -e .event' 200 '_id')
echo -e "$result \n\n"
# (6.2) Try and get the information of ALL channels for the group 
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"group":"6243be61247839960ce66347"}}'
echo $event > ".event" # Create json event file 
result=$(test '6.2'  'sudo sam local invoke ChannelGetInfo -e .event' 200 '_id')
echo -e "$result \n\n"

# (7) GROUP/GET/EXISTS
echo -e "\n\n(7) ****************** GROUP/GET/EXISTS ******************\n\n"
# (7.1) Group found to exists with the passed name
result=$(test '7.1' 'sudo sam local invoke GroupGetExists -e tests/group/get/exists-true.json' 200 'true')
echo -e "$result \n\n"
# (7.2) No group found with passed name
result=$(test '7.2' 'sudo sam local invoke GroupGetExists -e tests/group/get/exists-false.json' 200 'false')
echo -e "$result \n\n"

# (8) CHANNEL/GET/EXISTS
echo -e "\n\n(8) ****************** CHANNEL/GET/EXISTS ******************\n\n"
# (8.1) Check if channel exists: Group exists, but channel does not  
result=$(test '8.1' 'sudo sam local invoke ChannelGetExists -e tests/channel/get/exists-group-nochannel.json' 200 'false')
echo -e "$result \n\n"
# (8.2) Check if channel exists: Group does NOT exist, but channel does  
result=$(test '8.2' 'sudo sam local invoke ChannelGetExists -e tests/channel/get/exists-nogroup-channel.json' 200 'false')
echo -e "$result \n\n"
# (8.3) Check if channel exists: Group does exist, channel does exist  
result=$(test '8.3' 'sudo sam local invoke ChannelGetExists -e tests/channel/get/exists-group-channel.json' 200 'true')
echo -e "$result \n\n"

# (9) GROUP/POST/CREATE
echo -e "\n\n(9) ****************** GROUP/POST/CREATE ******************\n\n"
# (9.1) Try and create a group with a duplicate name
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"test\",\"isPrivate\":false}"}'
echo $event > ".event" # Create json event file 
result=$(test '9.1'  'sudo sam local invoke GroupPostCreate -e .event' 401 'A group already exists with this name')
echo -e "$result \n\n"
# (9.2) Create a new group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"'$(timestamp)'\",\"isPrivate\":false}"}'
echo $event > ".event" # Create json event file
result=$(test '9.2'  'sudo sam local invoke GroupPostCreate -e .event' 200 '_id')
echo -e "$result \n\n"

# (10) GROUP/POST/SEARCH
echo -e "\n\n(10) ****************** GROUP/POST/SEARCH ******************\n\n"
# (10.1) Search for a group - Find by name (fuzzy)
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"est\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '10.1'  'sudo sam local invoke GroupPostSearch -e .event' 200 '_id')
echo -e "$result \n\n"
# (10.2) Search for a group - Find by user ID
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"member\": \"6243cec904796429d00e5e15\"}"}'
echo $event > ".event" # Create json event file
result=$(test '10.2'  'sudo sam local invoke GroupPostSearch -e .event' 200 '6243cec904796429d00e5e15')
echo -e "$result \n\n"
# (10.3) Search for a group - Find by FRIEND name - NOT Found
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"name\":\"test\", \"friend\":true}"}'
echo $event > ".event" # Create json event file 
result=$(test '10.3'  'sudo sam local invoke GroupPostSearch -e .event' 200 '[]')
echo -e "$result \n\n"

# (11) GROUP/GET/MEMBERS
echo -e "\n\n(11) ****************** GROUP/GET/MEMBERS ******************\n\n"
# (11.1) Get information of the members of a group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"group": "6243be61247839960ce66347"}}'
echo $event > ".event" # Create json event file 
result=$(test '11.1'  'sudo sam local invoke GroupGetMembers -e .event' 200 '6257b6415407fb4f33fde8a4')
echo -e "$result \n\n"

# (12) CHANNEL/POST/MESSAGE
echo -e "\n\n(12) ****************** CHANNEL/POST/MESSAGE ******************\n\n"
# (12.1) Add a message
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\":\"6243bfd0247839960ce66349\",\"username\":\"test\",\"message\":\"Automated Test: '$(timestamp)'\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '12.1'  'sudo sam local invoke ChannelPostMessage -e .event' 200 'true')
echo -e "$result \n\n"

# (13) CHANNEL/GET/MESSAGE
echo -e "\n\n(13) ****************** CHANNEL/GET/MESSAGEs ******************\n\n"
# (13.1) Retrieve messages from the channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"channel":"6243bfd0247839960ce66349","date": "2022-04-01"}}'
echo $event > ".event" # Create json event file 
result=$(test '13.1'  'sudo sam local invoke ChannelGetMessages -e .event' 200 'reactions')
echo -e "$result \n\n"

# (14) USER/GET/SEARCH
echo -e "\n\n(14) ****************** USER/GET/SEARCH ******************\n\n"
# (14.1) Search user - Text search - Excluding members of passed group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"username": "**test***", "group": "6243be61247839960ce66347"}}'
echo $event > ".event" # Create json event file 
result=$(test '14.1' 'sudo sam local invoke UserGetSearch -e .event' 200 'username')
echo -e "$result \n\n"
# (14.2) Search user - Text search - Not found as user is In the group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"queryStringParameters":{"username": "First Last", "group": "6243be61247839960ce66347"}}'
echo $event > ".event" # Create json event file 
result=$(test '14.2' 'sudo sam local invoke UserGetSearch -e .event' 200 '[]')
echo -e "$result \n\n"

# END2

# (15) CHANNEL/PUT/MEMBER
echo -e "\n\n(15) ****************** CHANNEL/PUT/MEMBER ******************\n\n"
# (15.1) Add a member to a channel - Error when member already exists in the channel 
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '15.1' 'sudo sam local invoke ChannelPutMember -e .event' 401 'already a member of the channel')
echo -e "$result \n\n"
# (15.2) Remove the member from a channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '15.2' 'sudo sam local invoke ChannelPatchMember -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (15.3) Remove a member that does not exist in the channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '15.3' 'sudo sam local invoke ChannelPatchMember -e .event' 401 'can not be removed')
echo -e "$result \n\n"
# (15.4) Successfully add the member back into the channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '15.4' 'sudo sam local invoke ChannelPutMember -e .event' 200 '6257b6415407fb4f33fde8a4')
echo -e "$result \n\n"

# (16) CHANNEL/PATCH/RENAME
echo -e "\n\n(16) ****************** CHANNEL/PATCH/RENAME ******************\n\n"
# (16.1) Change a channels name
newName=$(timestamp)
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"name\": \"'$newName'\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '16.1' 'sudo sam local invoke ChannelPatchRename -e .event' 200 $newName)
echo -e "$result \n\n"
# (16.2) Change a channels name - Error: newName == currentName
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"name\": \"'$newName'\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '16.2' 'sudo sam local invoke ChannelPatchRename -e .event' 401 'already exists')
echo -e "$result \n\n"
# (16.3) Change channels name back to test
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\", \"name\": \"test\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '16.3' 'sudo sam local invoke ChannelPatchRename -e .event' 200 'test')
echo -e "$result \n\n"

# (17) CHANNEL/DELETE/DEACTIVATE
echo -e "\n\n(17) ****************** CHANNEL/DELETE/DEACTIVATE ******************\n\n"
# (17.1) Deactivate a channel
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"channel\": \"6243bfd0247839960ce66349\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '17.1' 'sudo sam local invoke ChannelDeleteDeactivate -e .event' 200 'true')
echo -e "$result \n\n"
# NB: Need to reactivate the test channel aftetr testing

# (18) GROUP/PUT/MEMBER
echo -e "\n\n(18) ****************** GROUP/PATCH/MEMBER ******************\n\n"
# (18.1) Remove the member from a group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"group\": \"6243be61247839960ce66347\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '18.1' 'sudo sam local invoke GroupPatchMember -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (18.2) Remove a member that does not exist in the group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"group\": \"6243be61247839960ce66347\", \"member\": \"6257b6415407fb4f33fde8a4\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '18.2' 'sudo sam local invoke GroupPatchMember -e .event' 401 'can not be removed')
echo -e "$result \n\n"
# NB: Need to reactivate the member after testing

# (19) GROUP/DELETE/DEACTIVATE
echo -e "\n\n(19) ****************** GROUP/DELETE/DEACTIVATE ******************\n\n"
# (19.1) Deactivate a group
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"group\": \"6243be61247839960ce66347\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '19.1' 'sudo sam local invoke GroupDeleteDeactivate -e .event' 200 'true')
echo -e "$result \n\n"
# NB: Need to reactivate the test group after testing

# : <<'END3'
 
# (20) USER/PATCH/PASSWORD - Recovery token
echo -e "\n\n(20) ****************** USER/PATCH/PASSWORD (Recovery) ******************\n\n"
# (20.1) Change password
event='{"headers":{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjNiYjc4ZTNjYjQxZmI3MmM5MzZkZjMiLCJuYW1lIjoiRmlyc3QgTGFzdCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInVzZXJuYW1lIjoidGVzdCIsImlhdCI6MTY1MjA3NzMzNiwiZXhwIjoxNjUyNjgyMTM2fQ.6o5vGn-N0Z4wMW7VwGvUEL6P1fMMsSTHid6iCcvYiG8"},"body":"{\"email\":\"test@test.com\",\"password\":\"Password2@\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '20.1' 'sudo sam local invoke UserPatchPassword -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (20.2) Login with the new password
event='{"body":"{\"username\":\"test@test.com\",\"password\":\"Password2@\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '20.2' 'sudo sam local invoke UserPostLogin -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (20.3) Change password back
event='{"headers":{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjNiYjc4ZTNjYjQxZmI3MmM5MzZkZjMiLCJuYW1lIjoiRmlyc3QgTGFzdCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInVzZXJuYW1lIjoidGVzdCIsImlhdCI6MTY1MjA3NzMzNiwiZXhwIjoxNjUyNjgyMTM2fQ.6o5vGn-N0Z4wMW7VwGvUEL6P1fMMsSTHid6iCcvYiG8"},"body":"{\"email\":\"test@test.com\",\"password\":\"Password1!\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '20.3' 'sudo sam local invoke UserPatchPassword -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# NB: Need to manually create the Special password recovery token for testing

# END3

# (21) USER/PATCH/PASSWORD - Self change
echo -e "\n\n(20) ****************** USER/PATCH/PASSWORD (Self-Changed) ******************\n\n"
# (21.1) Change password
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"email\":\"test@test.com\",\"password\":\"Password2@\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '21.1' 'sudo sam local invoke UserPatchPassword -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (21.2) Login with the new password
event='{"body":"{\"username\":\"test@test.com\",\"password\":\"Password2@\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '21.2' 'sudo sam local invoke UserPostLogin -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (21.3) Change password back
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"email\":\"test@test.com\",\"password\":\"Password1!\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '21.3' 'sudo sam local invoke UserPatchPassword -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"

# (22) USER/PATCH/DATA
echo -e "\n\n(22) ****************** USER/PATCH/DATA ******************\n\n"
# (22.1) Change data
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"email\":\"test-email-update@test.com\",\"name\":\"Test Update\",\"username\":\"test-username-update\",\"dob\":\"1999-03-01\",\"phone\":\"12345678\",\"avatar\":\"1234567890\",\"active\": true, \"public\":false}"}'
echo $event > ".event" # Create json event file 
result=$(test '22.1' 'sudo sam local invoke UserPatchData -e .event' 200 'test-username-update')
echo -e "$result \n\n"
# (22.2) Login with the new username
event='{"body":"{\"username\":\"test-username-update\",\"password\":\"Password1!\"}"}'
echo $event > ".event" # Create json event file 
result=$(test '22.2' 'sudo sam local invoke UserPostLogin -e .event' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"
# (22.3) Change data back
event='{"headers":{"Authorization":"Bearer '$YAMA_TOKEN'"},"body":"{\"email\":\"test@test.com\",\"name\":\"First Last\",\"username\":\"test\",\"dob\":\"2000-07-01\",\"phone\":\"0410123456\",\"avatar\":null,\"active\": true, \"public\":true}"}'
echo $event > ".event" # Create json event file 
result=$(test '22.3' 'sudo sam local invoke UserPatchData -e .event' 200 'test@test.com')
echo -e "$result \n\n"

# (23) USER/POST/LOGIN
echo -e "\n\n(23) ****************** USER/POST/LOGIN ******************\n\n"
# (23.1) Login using username with INCORRECT case
result=$(test '23.1' 'sudo sam local invoke UserPostLogin -e tests/user/post/login-username-case.json' 200 '623bb78e3cb41fb72c936df3')
echo -e "$result \n\n"


title="\n\n********** TEST: COMPLETE **********\n\n" 
echo -e $title
echo -e $title >> "result.log"
