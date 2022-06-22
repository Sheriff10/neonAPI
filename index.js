const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const con = require("./dbConnect");

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mongoose.createConnection();

db.openUri(
  "mongodb+srv://sephora:frZEKREp1dBnXfY0@cluster0.ggjkuqt.mongodb.net/?retryWrites=true&w=majority",
  { useUnifiedTopology: true }
);
mongoose.connection.on("error", (err) => {
  logError(err);
});

// home
app.get("/", async (req, res) => {
  const data = await db.collection("users").find({}).toArray();
  res.send(data);
});

// Signup Users
app.post("/signup", async (req, res) => {
  const { username, email, password, upline, address } = req.body;
  const countUsers = await (
    await db.collection("users").find({}).toArray()
  ).length;
  const hashPassword = await bcrypt.hash(password, 10);

  const new_user = {
    id: countUsers + makeid(10),
    username,
    email,
    password: hashPassword,
    upline,
    balance: 0,
    recharge: 0,
    deposit: 0,
    ref: 0,
    withdrawal: 0,
    address,
  };

  //   generate random id text
  function makeid(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  //   find username
  const findUsername = (
    await db.collection("users").find({ username }).toArray()
  ).length;
  //   find email
  const findEmail = (await db.collection("users").find({ email }).toArray())
    .length;

  //   modify searches
  //   check username count
  if (findUsername > 0) {
    return res.send("username err");
  } else {
    // check email length
    if (findEmail > 0) {
      return res.send("email err");
    } else {
      // if no email and username exists insert data.
      db.collection("users").insertOne(new_user, (err, result) => {
        if (err) console.log(err);
        res.send(new_user);
      });

      const up = upline == null ? "null".length : upline.toString().length;
      console.log(up);
      if (up > 9) {
        //   Update Upline Refs
        const getUpline = await db
          .collection("users")
          .find({ id: upline })
          .toArray();
        const refs = parseInt(getUpline[0].ref);
        db.collection("users").updateOne(
          { id: upline },
          { $set: { ref: refs + 1 } }
        );
      }
    }
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const findUsername = await db
    .collection("users")
    .find({ username })
    .toArray();

  const countUsername = findUsername.length;

  if (countUsername > 0) {
    const hashPassword = findUsername[0].password;

    const comparePass = await bcrypt.compare(password, hashPassword);
    if (comparePass) {
      const date = new Date();
      const date_hrs = {
        date: date.getDate() + 1,
        hrs: date.getUTCHours(),
      };
      const update_cHrs = () => {
        var t = "" + date_hrs.hrs + "";
        if (t.length == 1)
          return parseInt(date_hrs.date + "" + date_hrs.hrs + 0);
        else {
          return parseInt(date_hrs.date + "" + date_hrs.hrs);
        }
      };

      // lets check if profit is ready

      const mine = async () => {
        console.log("mine called");
        const getActiveDeposit = await db
          .collection("deposits")
          .find({ username, active: "yes" })
          .toArray();

        const updateBal = async (pdate, dep_id) => {
          const compareHrs = update_cHrs() - pdate;

          if (compareHrs >= 100) {
            const guser = await db
              .collection("users")
              .find({ username })
              .toArray();
            const balance = guser[0].balance;

            db.collection("users").updateOne(
              { username },
              { $set: { balance: balance + 50 } }
            );
            db.collection("deposits").updateOne(
              { id: dep_id },
              { $set: { active: "completed" } }
            );
          }

          //h
        };

        for (i of getActiveDeposit) {
          updateBal(i.Date1, i.id);
        }

        const user = await db.collection("users").find({ username }).toArray();
        res.send(user);
      };
      mine();
    } else {
      res.send("invalid");
    }
  } else {
    res.send("invalid");
  }
});

// // DEPPOSIT
app.post("/deposit", async (req, res) => {
  // construct date
  const date = new Date();

  const date_obj = {
    month: date.getUTCMonth() + 1,
    date: date.getDate(),
  };
  const update_cDate = () => {
    var t = "" + date_obj.date + "";
    if (t.length == 1)
      return parseInt(date_obj.month + "" + 0 + "" + date_obj.date);
    else {
      return parseInt(date_obj.month + "" + date_obj.date);
    }
  };

  const date_hrs = {
    date: date.getDate() + 1,
    hrs: date.getUTCHours(),
  };
  const update_cHrs = () => {
    var t = "" + date_hrs.hrs + "";
    if (t.length == 1) return parseInt(date_hrs.date + "" + date_hrs.hrs + 0);
    else {
      return parseInt(date_hrs.date + "" + date_hrs.hrs);
    }
  };
  // sb
  const { hash, amount, username } = req.body;

  const count_depo = await db.collection("deposits").find({}).toArray();
  const deposit_data = {
    id: count_depo.length + 1,
    amount,
    username,
    hash,
    status: "pending",
    dep_date: update_cDate(),
    active: "no",
    Date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
    Date1: `${update_cHrs()}`,
  };
  const findHash = await db.collection("deposits").find({ hash }).toArray();
  const countHash = findHash.length;

  if (countHash > 0) res.send("hash err");
  else {
    db.collection("deposits").insertOne(deposit_data, (err, result) => {
      if (err) throw err;
      res.send("done");
    });
  }
});

// get Deposits
app.get("/getdeposit/:username", async (req, res) => {
  const username = req.params.username;

  const getdeposit = await db
    .collection("deposits")
    .find({ username })
    .toArray();
  res.send(getdeposit);
});

// Payout
app.post("/payout", async (req, res) => {
  const { amount, address, username } = req.body;
  const date = new Date();
  const amt = parseInt(amount);

  db.collection("users")
    .find({ username })
    .toArray(async (err, result) => {
      if (err) throw err;
      const getBal = parseInt(result[0].balance);
      const count_payout = await db.collection("payouts").find({}).toArray();
      const payout_data = {
        id: count_payout.length + 1,
        amount,
        address,
        username,
        status: "pending",
        Date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
      };
      if (amt > getBal) res.send("bal err");
      else {
        db.collection("payouts").insertOne(payout_data, (err, result) => {
          if (err) throw err;
          if (result.acknowledged == true) {
            db.collection("users").updateOne(
              { username },
              { $set: { balance: getBal - amt } }
            );
          }
          res.send("done");
        });
      }
    });
});

// Payouts
app.get("/getpayouts/:username", async (req, res) => {
  const username = req.params.username;

  const getdeposit = await db
    .collection("payouts")
    .find({ username })
    .toArray();
  res.send(getdeposit);
});

// admin get pending deposit
app.get("/pendeposit", (req, res) => {
  db.collection("deposits")
    .find({ status: "pending" })
    .toArray((err, result) => {
      if (err) throw err;
      res.send(result);
    });
});

// admin get pending withdrawal
app.get("/penwithdrawal", (req, res) => {
  db.collection("payouts")
    .find({ status: "pending" })
    .toArray((err, result) => {
      if (err) throw err;
      res.send(result);
    });
});

app.post("/condeposit", async (req, res) => {
  const { amount, username, id, status } = req.body;

  if (status == "cancelled") {
    db.collection("deposits").updateOne({ id }, { $set: { status } });
  } else {
    const getBal = await db.collection("users").find({ username }).toArray();
    const cBal = parseInt(getBal[0].recharge);
    const upline = getBal[0].upline;

    const commission = (5 / 100) * parseInt(amount);

    db.collection("users").updateOne(
      { username },
      { $set: { recharge: cBal + parseInt(amount) } }
    );
    db.collection("deposits").updateOne(
      { id },
      { $set: { status, active: "yes" } }
    );
    const up = upline == null ? "null".length : upline.toString().length;
    if (up > 9) {
      const get_upline_bal = await db
        .collection("users")
        //
        .find({ id: upline })
        .toArray();
      const upline_bal = parseInt(get_upline_bal[0].balance);
      db.collection("users").updateOne(
        { id: upline },
        {
          $set: {
            balance: upline_bal + commission,
          },
        }
      );
    }
  }
  res.send("done");
});

// CONFIRM PAYOUTs
app.post("/conpayout", async (req, res) => {
  const { amount, username, id, status } = req.body;

  if (status == "cancelled") {
    db.collection("payouts").updateOne({ id }, { $set: { status } });
  } else {
    const getBal = await db.collection("users").find({ username }).toArray();
    db.collection("payouts").updateOne({ id }, { $set: { status } });
  }
  res.send("done");
});

app.listen(process.env.PORT || port, () => {
  console.log("Sephora");
});
