// const express = require("express");
// const cors = require("cors");
// const multer = require("multer");
// const { MongoClient, ServerApiVersion } = require("mongodb");
// require("dotenv").config();

// const app = express();
// const port = 5000;

// app.use(cors({
//     origin: "*", // সব সোর্স থেকে রিকোয়েস্ট অ্যালাউ করুন
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true
// }));
// app.use(express.json());

// const upload = multer({ dest: "uploads/" });

// const uri = process.env.MONGODB_URL;
// const client = new MongoClient(uri, {
//   serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
// });

// let db;

// async function connectDB() {
//   try {
//     await client.connect();
//     db = client.db("arthub_db");
//     console.log("Successfully connected to MongoDB!");
//   } catch (err) {
//     console.error("Database Connection Error:", err);
//   }
// }

// connectDB();

// // POST API
// app.post("/api/artwork", upload.single("image"), async (req, res) => {
//   try {

//     if (!db) {
//       return res.status(500).send({ message: "Database not connected" });
//     }

//     const { title, price, category, description } = req.body;
//     const file = req.file;

//     const artworkData = {
//       title,
//       price: parseFloat(price),
//       category,
//       description,
//       imageUrl: file ? `/uploads/${file.filename}` : null,
//       createdAt: new Date(),
//     };

//     const result = await db.collection("artworks").insertOne(artworkData);
//     res.status(201).send(result);
//   } catch (error) {
//     console.error("Insert Error:", error);
//     res.status(500).send({ message: "Failed to save artwork" });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
