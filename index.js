const express = require("express");
const bodyparser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const schedule = require("node-schedule");
const Datastore = require("nedb");

const app = express();
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true })); //important for collecting post content
app.use(express.static("public"));

const storydb = new Datastore("db/stories.db");
storydb.loadDatabase();

const commentdb = new Datastore("db/comment.db");
commentdb.loadDatabase();

let oldresults = [];

// getting data and sending to database every 5 min.
function getData() {
  axios("https://hacker-news.firebaseio.com/v0/topstories.json")
    .then((response) => {
      let results = [response.data[response.data.length - 1]];

      // let result2 = response.data.slice(0, 100);

      console.log(oldresults);
      console.log(results);

      if (oldresults[0] === results[0]) {
        console.log("they are the same");
      } else {
        console.log("not the same");
        results.forEach((id) => {
          // axios to get the actual content from api
          axios
            .get("https://hacker-news.firebaseio.com/v0/item/" + id + ".json")
            .then((response) => {
              let res = response.data;
              storydb.insert(response.data);

              console.log("story inserted");
              let kids = response.data.kids;

              // code to get comments
              kids.forEach((id) => {
                axios
                  .get(
                    "https://hacker-news.firebaseio.com/v0/item/" + id + ".json"
                  )
                  .then((response) => {
                    commentdb.insert(response.data);
                    console.log("comment inserted");
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              });
              // -----
            })
            .catch((err) => {
              console.log(err);
            });
        });
        oldresults = results;
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

const job = schedule.scheduleJob("job", "*/5 * * * *", () => {
  getData();
  // job.cancel();
  console.log("content fetched");
});

app.get("/", async (req, res) => {
  storydb.find({}, function (err, output) {
    if (err) {
      console.log(err);
    } else {
      res.render("index", { output });
    }
  });
});

app.get("/news", (req, res) => {
  res.render("news");
});

app.get("/search", (req, res) => {
  const searchtext = req.query.search;
  var regexObj = new RegExp(searchtext);

  storydb.find({ title: regexObj }, function (err, storycontent) {
    if (err) {
      console.log(err);
    } else {
      res.render("search", { storycontent });
    }
  });
});

app.get("/story/:id", (req, res) => {
  let parentid = Number(req.params["id"]);

  storydb.find({ id: parentid }, function (err, storycontent) {
    if (err) {
      console.log(err);
    } else {
      commentdb.find({ parent: parentid }, function (err, commentcontent) {
        if (err) {
          console.log(err);
        } else {
          res.render("story", { commentcontent, storycontent });
          // const d = new Date();
          // console.log(d);
        }
      });
    }
  });
});

//
//

app.listen(3000, () => {
  console.log("server started!");
});
