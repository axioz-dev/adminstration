import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
// const collection = connectToDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
import { MongoClient } from "mongodb";

//for getting all the info from the database
app.get("/all", async (req, res) => {
  const uri = process.env.MONGO_URL;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db();
    const reg = database.collection("registrations");
    const results = await reg
      .aggregate([
        {
          $lookup: {
            from: "users", // Name of the other collection
            localField: "registeredUser", // Field in the "registrations" collection
            foreignField: "_id", // Field in the "otherCollection" that matches "_id" from "registrations"
            as: "joinedData", // Name of the field that will contain the joined data
          },
        },
        { $unwind: "$joinedData" }, // Unwind the joinedData array
        {
          $group: {
            _id: "$joinedData.collegeName", // Field in joinedData to group by
            registrations: {
              $push: "$$ROOT",
            },
          },
        },
        {
          $project: {
            // Include only the necessary fields in the output
            collegeName: "$_id", // Rename _id to collegeName
            registrations: 1, // Include the registrations array
            _id: 0, // Exclude the _id field
            // Omit other fields if necessary
          },
        },
      ])
      .toArray();
    res.json(results);
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.json(error);
  }
});

//for updating the registraion count just in case
app.post("/update", async (req, res) => {
  const { email, value } = req.body;
  if (email === undefined || value === undefined)
    res.json({ error: "Please provide email and value" });
  const uri = process.env.MONGO_URL;
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const database = client.db();
    const reg = database.collection("users");
    const results = await reg.updateOne(
      { email: email },
      { $set: { registration: Number(value) } }
    );
    res.json(results);
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.json(error);
  }
});

//for retriveing the specific event data
app.post("/specific", async (req, res) => {
  const { value } = req.body;
  if (value === undefined)
    res.json({ error: "Please provide email and value" });
  const uri = process.env.MONGO_URL;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db();
    const reg = database.collection("registrations");
    const pipeline = [
      {
        $lookup: {
          from: "users", // The collection to join with
          localField: "registeredUser", // The field from the 'registrations' collection
          foreignField: "_id", // The field from the 'users' collection
          as: "userData", // The field to add the joined user data to
        },
      },
      {
        $project: {
          // "userData.collegeName": 1,  //!for retrieving along with user details
          [value]: 1,
          _id: 0,
        },
      },
    ];
    const results = await reg.aggregate(pipeline).toArray();
    res.json(results);
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.json(error);
  }
});

// ! for deleting the user count (be careful)
app.post("/delete", async (req, res) => {
  const { email } = req.body;
  if (email === undefined) res.json({ error: "Please provide email" });
  const uri = process.env.MONGO_URL;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db();
    const usr = database.collection("users");
    const user = await usr.findOneAndDelete({ email: email });
    const reg = database.collection("registrations");
    const deleteResult = await reg.deleteMany({ registeredUser: user._id });
    res.json({ userData: user, registrationData: deleteResult });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.json(error);
  }
});

app.listen(3000, () => console.log("Server is running on port 3000"));
