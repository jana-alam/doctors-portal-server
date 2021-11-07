const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
require("dotenv").config();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@janaalam.ewacz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// doctors-portal-firebase-adminsdk.json

const serviceAccount = require("./doctors-portal-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function verify(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer")) {
    const token = req.headers.authorization.split(" ")[1];
    const decodedUser = await admin.auth().verifyIdToken(token);
    if (decodedUser) {
      req.requester = decodedUser.email;
    }
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointsment");
    const userCollection = database.collection("users");
    console.log("form daatavbae");

    // send data to server
    app.post("/appointments", async (req, res) => {
      const appointmentInfo = req.body;
      const result = await appointmentsCollection.insertOne(appointmentInfo);
      console.log(result);
      res.json(result);
    });

    // saved user data in database

    app.post("/user", async (req, res) => {
      const userInfo = req.body;
      const result = await userCollection.insertOne(userInfo);
      res.json(result);
    });

    app.put("/user", async (req, res) => {
      const userInfo = req.body;
      const filter = { email: userInfo.email };
      const options = { upsert: true };
      const updatedDoc = { $set: userInfo };

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.json(result);
    });

    // admin update

    app.put("/user/admin", verify, async (req, res) => {
      const admin = req.body;
      const requesterEmail = req.requester;
      if (requesterEmail) {
        const verified = await userCollection.findOne({
          email: requesterEmail,
        });
        if (verified?.role) {
          const filter = { email: admin.email };
          const updatedDoc = { $set: { role: "admin" } };
          const result = await userCollection.updateOne(filter, updatedDoc);
          res.json(result);
        }
      } else {
        res.status(403).json({ message: "not permitted" });
      }
    });
    // get admin

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      let admin = false;
      if (result?.role === "admin") {
        admin = true;
      }
      console.log(admin);
      res.json({ admin: admin });
    });

    // const database = client.db("sample_mflix");
    // const movies = database.collection("movies");
  } finally {
  }
}

run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
