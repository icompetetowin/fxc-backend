const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const mongoose = require("mongoose");
const filter = require("bad-words");
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";
const nanoid = customAlphabet(alphabet, 6);
const app = express();
const port = 5000;

mongoose.connect(process.env.MONGODB_URI);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rankingSchema = new mongoose.Schema({
  nickname: String,
  shortname: String,
  highscore: Number,
  scoretime: Date
});

rankingSchema.index({ highscore: -1, scoretime: 1 });

const Ranking = new mongoose.model("Ranking", rankingSchema);

const customFilter = new filter({ placeHolder: "x" });

app.get("/", (req, res) => {
  res.json({ message: "Good luck on FXC!" });
});

app.get("/api/highscores/:_id", async (req, res) => {
  try {
    const top3 = await Ranking.find({}, "-_id nickname shortname highscore")
      .sort({ highscore: -1, scoretime: 1 })
      .limit(3);
    const player = await Ranking.findById(req.params._id);
    const playersAbove = await Ranking.find({
      highscore: { $gt: player.highscore }
    }).count();
    const personalRank = playersAbove + 1;

    res.json({
      top3Arr: top3,
      myRank: personalRank,
      myHighscore: player.highscore
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/highscores", async (req, res) => {
  try {
    const name = req.body.nickname;
    const cleanName = customFilter.clean(name);
    const regex = /[^0-9a-zA-Z]/g;
    const filteredName = cleanName.replace(regex, "x");
    const nameAndId = `${filteredName}#${nanoid()}`;
    const myScoreTime = new Date().getTime();
    const ranking = new Ranking({
      nickname: nameAndId,
      shortname: filteredName,
      highscore: 0,
      scoretime: myScoreTime
    });
    await ranking.save();
    res.json(ranking);
  } catch (error) {
    console.log(error);
  }
});

app.put("/api/highscores/:_id", async (req, res) => {
  try {
    const ranking = await Ranking.findById(req.params._id);
    const myScoreTime = new Date().getTime();
    if (ranking.highscore < req.body.highscore) {
      ranking.highscore = req.body.highscore;
      ranking.scoretime = myScoreTime;
      await ranking.save();
      res.json(ranking);
    }
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});
