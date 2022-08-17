import { MongoClient, ServerApiVersion } from 'mongodb';
import ( getDBCredentials } from "./.secret");

let clientPromise

if (!global._mongoClientPromise) {
    const uri = getDBCredentials().URI;

    const options = {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        serverApi: ServerApiVersion.v1
    } 

    const client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
}
clientPromise = global._mongoClientPromise

export default clientPromise
