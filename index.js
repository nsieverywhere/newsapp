const express = require("express");
const bodyparser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const schedule = require("node-schedule");

const app = express();
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true })); //important for collecting post content
app.use(express.static("public"));
let stories = [];
let id = "";
let title = "";
let author = "";
let content = [];

// create stories DB
let storiesDB = new sqlite3.Database("./db/storiesdb", (err) => {
  if (err) {
    return console.error(err.message);
  } else {
    storiesDB.run(
      "CREATE TABLE IF NOT EXISTS story(author, id, title, content, comments)"
    );
    console.log("database created");
  }
});

// getting data and sending to database every 5 min.
function getData() {
  axios("https://hacker-news.firebaseio.com/v0/topstories.json")
    .then((response) => {
      let result = response.data.slice(0, 1);
      result.forEach((id) => {
        axios
          .get("https://hacker-news.firebaseio.com/v0/item/" + id + ".json")
          .then((response) => {
            let item = response.data;
            id = response.data.id;
            title = response.data.title;
            author = response.data.by;
            stories.push(item);

            item.kids.forEach((newitem) => {
              axios
                .get(
                  "https://hacker-news.firebaseio.com/v0/item/" +
                    newitem +
                    ".json"
                )
                .then((response) => {
                  content = response.data.by;
                  console.log(content);
                })
                .catch((err) => {
                  console.log(err);
                });
            });
          })
          .catch((err) => {
            console.log(err);
          });
      });
    })
    .catch((err) => {
      console.log(err);
    });

  // insert items into db
  storiesDB.run(
    `insert into story(id, title, author, content) VALUES(?, ?, ?, ?)`,
    [id, title, author, content],
    function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("item inserted in db.");
      }
    }
  );
}

const job = schedule.scheduleJob("job", "*/10 * * * * *", () => {
  getData();
  job.cancel();
});

app.get("/", async (req, res) => {
  res.render("index", { stories });
});

app.get("/news", (req, res) => {
  res.render("news");
});

app.get("/story", (req, res) => {
  res.render("story");
});

//
//

app.listen(3000, () => {
  console.log("server started!");
});
