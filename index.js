require("dotenv").config();
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const User = require("./models/User");

const File = require("./models/File");

const express = require("express");
const http = require("http");

const PORT =process.env.PORT|| 3000;
const app = express();
const server = http.createServer(app);
const session = require("express-session");
const MongoStore = require("connect-mongo");
app.use(
  session({
    name: "user.sid",
    secret: "secret",
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60 * 7,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE_URL,
    }),
  })
);

app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/upload");
  } else {
    res.render("index");
  }
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/upload");
  } else {
    res.render("login");
  }
});

app.get("/upload", async (req, res) => {
  if (!req.session.user) {
    res.redirect("/");
  } else {
    const username = req.session.user.username;
    const data = await File.find({ username });
    const headers = req.headers.host;
    res.render("upload", { name: username, data: data, headers: headers });
  }
});

app.post("/delete",async(req,res)=>{
  console.log(req.body);
  res.redirect("/upload")
})

app.post("/register", async (req, res) => {
  const { username, password, gender } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const findUser = await User.findOne({ username: username });
  console.log(findUser);
  if (!findUser) {
    await User.create(
      { username, password: hashedPassword, gender },
      {
        bufferMaxEntries: 100000,
      }
    );
    res.redirect("/login");
  }
  else{
    res.render("index", { error: "User already registered" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user) {
    if (await bcrypt.compare(password, user.password)) {
      req.session.user = {
        username,
        isLoggedIn: true,
      };

      try {
        req.session.save();
      } catch (err) {
        console.error("Error saving to session storage: ", err);
        return next(new Error("Error creating user"));
      }
      res.redirect("/upload");
    } else {
      res.render("login", { error: "Incorrect password" });
    }
  } else {
    res.render("login", { error: "User not registered" });
  }
});

app.post("/logout", async (req, res, next) => {
  try {
    req.session.destroy();
  } catch (err) {
    console.error("Error logging out:", err);
    return next(new Error("Error logging out"));
  }

  res.redirect("/");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    username: req.session.user.username,
    path: req.file.path,
    originalName: req.file.originalname,
  };

  if (req.body.password != null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 12);
  }

  const file = await File.create(fileData);
  const username = req.session.user.username;

  res.render("upload", {name:username, fileLink: `${req.headers.origin}/file/${file.id}` });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);
  if (file.password != null) {
    if (req.body.password == null) {
      res.render("password", { name: file.originalName });
      return;
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { error: true, name: file.originalName });
      return;
    }
  }
  res.download(file.path, file.originalName);
}

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
