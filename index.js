const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // ObjectId যোগ করা হয়েছে
require("dotenv").config();

const app = express();
const port = 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

// ছবি দেখার জন্য স্ট্যাটিক ফোল্ডার
app.use("/uploads", express.static("uploads"));

const upload = multer({ dest: "uploads/" });

const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("arthub_db");
    console.log("Successfully connected to MongoDB!");
  } catch (err) {
    console.error("Database Connection Error:", err);
  }
}
connectDB();

// 1. GET: সব আর্টওয়ার্ক পাওয়ার জন্য
app.get("/api/artwork", async (req, res) => {
  try {
    const artworks = await db.collection("artworks").find().toArray();
    res.send(artworks);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch artworks" });
  }
});

// 2. POST: আর্টওয়ার্ক সেভ করার জন্য
app.post("/api/artwork", upload.single("image"), async (req, res) => {
  try {
    const { title, price, category, description, artistName } = req.body; // artistName যোগ করুন
    const file = req.file;

    const artworkData = {
      title,
      price: parseFloat(price),
      category,
      description,
      artistName: artistName || "Unknown Artist", // নাম সেভ করুন
      imageUrl: file ? `/uploads/${file.filename}` : null,
      createdAt: new Date(),
    };

    const result = await db.collection("artworks").insertOne(artworkData);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to save" });
  }
});

// 1. GET specific artwork for the edit form
app.get("/api/artwork/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await db.collection("artworks").findOne(query);
  res.send(result);
});

// 2. PUT to update the artwork
app.put("/api/artwork/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const query = { _id: new ObjectId(id) };

  const result = await db.collection("artworks").updateOne(query, {
    $set: {
      title: updatedData.title,
      price: parseFloat(updatedData.price),
      category: updatedData.category,
      description: updatedData.description,
      artistName: updatedData.artistName,
    },
  });
  res.send(result);
});

// 3. DELETE
app.delete("/api/artwork/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await db.collection("artworks").deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete artwork" });
  }
});


app.put("/api/user/update/:id", async (req, res) => {
  const userId = req.params.id;
  const { name, email, oldName } = req.body; // ফ্রন্টএন্ড থেকে 'oldName' পাঠাতে হবে

  try {
    let queryId;
    try { queryId = new ObjectId(userId); } catch (e) { queryId = userId; }

    // ১. ইউজার কালেকশনে নাম আপডেট
    const userResult = await db.collection("users").updateOne(
      { _id: queryId },
      { $set: { name, email } }
    );

    if (userResult.matchedCount === 0) {
      return res.status(404).json({ message: "User not found!" });
    }

    // ২. যদি নাম পরিবর্তন হয়ে থাকে, তবে আর্টওয়ার্ক কালেকশনে সব আর্ট আপডেট করুন
    if (oldName && oldName !== name) {
      await db.collection("artworks").updateMany(
        { artistName: oldName }, // পুরনো নাম দিয়ে খুঁজুন
        { $set: { artistName: name } } // নতুন নাম সেট করুন
      );
      console.log(`Updated artworks for artist: ${oldName} to ${name}`);
    }

    return res.status(200).json({ message: "Profile and Artworks updated successfully" });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
