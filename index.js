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

app.get("/api/debug-user/:id", async (req, res) => {
  const id = req.params.id;
  const user = await db.collection("user").findOne({ _id: new ObjectId(id) });
  res.json({ found: !!user, user });
});

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
    db = client.db("arthub");
    console.log("Successfully connected to MongoDB!");
  } catch (err) {
    console.error("Database Connection Error:", err);
  }
}
connectDB();

// 1. GET: 
app.get("/api/artwork", async (req, res) => {
  try {
    const artworks = await db.collection("artworks").find().toArray();
    res.send(artworks);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch artworks" });
  }
});

// 2. POST: 
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

// comment 
app.post("/api/artwork/comment/:id", async (req, res) => {
  const { id } = req.params;
  const { user, comment } = req.body;

  try {
    const result = await db
      .collection("artworks")
      .updateOne(
        { _id: new ObjectId(id) },
        { $push: { comments: { user, comment, date: new Date() } } },
      );
    res.status(200).json({ message: "Comment added successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment" });
  }
});
//comment delete
app.delete("/api/artwork/comment/:artworkId/:commentIndex", async (req, res) => {
    const { artworkId, commentIndex } = req.params;
    
    try {
       
        await db.collection("artworks").updateOne(
            { _id: new ObjectId(artworkId) },
            { $unset: { [`comments.${commentIndex}`]: 1 } }
        );
       
        await db.collection("artworks").updateOne(
            { _id: new ObjectId(artworkId) },
            { $pull: { comments: null } }
        );
        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting" });
    }
});

app.put("/api/user/update/:id", async (req, res) => {
  const userId = req.params.id;
  const { name, email, oldName } = req.body;

  console.log("Updating User ID:", userId);
  console.log("Data Received:", { name, email, oldName });

  try {
    const userResult = await db
      .collection("user")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { name: name, email: email, updatedAt: new Date() } },
      );

    if (userResult.matchedCount === 0) {
      return res.status(404).json({ message: "User not found!" });
    }
    if (oldName && oldName !== name) {
      const artResult = await db
        .collection("artworks")
        .updateMany({ artistName: oldName }, { $set: { artistName: name } });
      console.log(`Updated ${artResult.modifiedCount} artworks`);
    }

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
