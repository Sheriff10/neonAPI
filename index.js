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

// const SqlString = require('mysql/lib/protocol/SqlString');
// var con = mysql.createConnection({
//   host     : 'sql11.freemysqlhosting.net',
//   user     : 'sql11494855',
//   password : 'tJ7C7YpzLu',
//   database : 'sql11494855'
// });
// con.connect(function(err) {
//   if (err) {
//     console.error('error connecting: ' + err.stack);
//     return;
//   }
//   console.log('connected as id ' + con.threadId);
// });

app.get("/", (req, res) => {
  db.collection("payouts")
    .find({})
    .toArray()
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/signup", async (req, res) => {
  const { username, email, password, upline } = req.body;
  const date = new Date();
  const hashPassword = await bcrypt.hash(password, 10);

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
  const login = update_cDate();

  const checkUsername = `select * from users where username = "${username}"`;
  con.query(checkUsername, (err, result) => {
    if (err) console.log(err);
    if (result.length > 0) {
      res.send("username err");
    }
    if (result.length == 0) {
      const findEmail = `select * from users where email = "${email}" `;
      con.query(findEmail, (err, result) => {
        if (err) console.log(err);
        if (result.length > 0) res.send("email err");
        if (result.length == 0) {
          const data = [
            `${username}`,
            `${email}`,
            1,
            0,
            `${hashPassword}`,
            0,
            0,
            0,
            0,
            parseInt(login),
          ];
          const newUser = `insert into users (username, email, upline, balance, password, ref, ref_earning, total_deposit, total_payout, login) 
          VALUES ('${username}', '${email}', '${upline}', 0, '${hashPassword}', 0, 0, 0, 0, 504) `;
          con.query(newUser, (err, result) => {
            if (err) console.log(err);
            res.send("inserted");
            const findUpline = `select * from users where id = '${upline}'`;
            con.query(findUpline, (err, result) => {
              if (err) console.log(err);
              console.log(result);
              if (result.length > 0) {
                const ref = parseInt(result[0].ref);
                console.log(ref);
                const updateUplineRef = `update users set ref = '${
                  ref + 1
                }' where id = '${upline}'`;
                con.query(updateUplineRef, (err, result) => {
                  if (err) console.log(err);
                  console.log(result);
                  console.log("updated");
                });
              }
            });
          });
        }
      });
    }
  });
});

// // LOGINs ssjsj
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const findUser = `select * from users where username = '${username}' `;

  con.query(findUser, async (err, result) => {
    if (err) console.log(err);
    if (result.length > 0) {
      const getHash = result[0].password;
      const comparePass = await bcrypt.compare(password, getHash);
      if (comparePass) res.send(result);
      else res.send("invalid");
    } else {
      res.send("invalid");
    }
  });
});

// // DEPPOSIT errr1
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

  const { hash, amount, email } = req.body;

  if (amount < 10) {
    res.send("err");
  } else {
    const findHash = `select * from deposits where hash = '${hash}' `;
    con.query(findHash, (err, result) => {
      if (err) console.log(err);
      if (result.length > 0) res.send("hash err");
      else {
        const newDepo = `insert into deposits (amount, email, hash, status, dep_date, active, Date) values ('${amount}', '${email}', '${hash}', 'pending', '${update_cDate()}', 0, '${date.getDate()}-${
          date.getMonth() + 1
        }-${date.getFullYear()}') `;

        con.query(newDepo, (err, result) => {
          if (err) console.log(err);
          res.send("done");
        });
      }
    });
  }
});

app.get("/getdeposit/:email", (req, res) => {
  const email = req.params.email;

  const getdeposit = `select * from deposits where email = '${email}' `;
  con.query(getdeposit, (err, result) => {
    if (err) console.log(err);
    res.send(result);
  });
});

app.post("/payout", async (req, res) => {
  const { amount, address, username } = req.body;
  const date = new Date();
  const amt = parseInt(amount);

  const getBal = `select * from users where username = '${username}'`;
  con.query(getBal, (err, result) => {
    if (err) console.log(err);
    if (result.length > 0) {
      const userBal = parseInt(result[0].balance);
      if (amt > userBal) res.send("bal err");
      else {
        const newPayout = `insert into payouts (amount, address, username, status, Date) values ('${amt}', '${address}', '${username}', 'pending', '${date.getDate()}-${
          date.getMonth() + 1
        }-${date.getFullYear()}')`;
        con.query(newPayout, (err, result) => {
          if (err) console.log(err);
          const updateBal = `update users set balance = '${
            userBal - amt
          }' where username = '${username}' `;
          con.query(updateBal, (err, result) => {
            if (err) console.log(err);
            else res.send("done");
          });
        });
      }
    }
  });
});
// njidjnj

app.get("/getpayout/:username", (req, res) => {
  const username = req.params.username;

  const getpayout = `select * from payouts where username = '${username}'`;
  con.query(getpayout, (err, result) => {
    if (err) console.log(err);
    res.send(result);
  });
});

app.get("/pendeposit", (req, res) => {
  const getPen = `select * from deposits where status = 'pending' `;
  con.query(getPen, (err, result) => {
    if (err) console.log(err);
    res.send(result);
  });
});

app.get("/penwithdrawal", (req, res) => {
  const getWith = `select * from payouts where status = 'pending'`;
  con.query(getWith, (err, result) => {
    if (err) console.log(err);
    res.send(result);
  });
});

app.post("/condeposit", async (req, res) => {
  const { amount, email, id, status } = req.body;

  if (status == "cancelled") {
    const cancel = `update deposits set status = '${status}' where id = '${id}'`;
    con.query(cancel, (err, result) => {
      if (err) console.log(err);
    });
  } else {
    const findUser = `select * from users where email = '${email}'`;
    con.query(findUser, (err, result) => {
      if (err) console.log(err);
      if (result.length > 0) {
        const total_deposit = parseInt(result[0].total_deposit);
        const upline = result[0].upline;

        const updateBal = `update users set total_deposit = '${
          total_deposit + parseInt(amount)
        }' where email = '${email}' `;
        const updateStats = `update deposits set status = '${status}' where id = '${id}' `;
        con.query(updateBal, (err, result) => {
          if (err) console.log(err);
        });
        con.query(updateStats, (err, result) => {
          if (err) console.log(err);
        });

        if (upline !== null && upline !== "undefined") {
          const getUplineBal = `select * from users where id = '${upline}'`;
          con.query(getUplineBal, (err, result) => {
            if (err) console.log(err);
            if (result.length > 0) {
              const upline_bal = parseInt(result[0].balance);

              const commission = (10 / 100) * parseInt(amount);

              const updateUplineBal = `update users set balance = '${
                upline_bal + commission
              }' where id = '${upline}'`;
              con.query(updateUplineBal, (err, result) => {
                if (err) console.log(err);
              });
            }
          });
          // const get_upline_bal = await db.collection('users').find({id: upline}).toArray();
          // const upline_bal = parseInt(get_upline_bal[0].balance)
          // const te = parseInt(get_upline_bal[0].ref_earning)
          // db.collection('users').updateOne({id: upline}, {$set: {balance: upline_bal + commission, ref_earning: te+commission}});
        }
      }
    });
  }
  res.send("done");
});

app.post("/conpayout", async (req, res) => {
  const { amount, username, id, status } = req.body;

  if (status == "cancelled") {
    const cancel = `update payouts set status = '${status}' where id = '${id}'`;
    con.query(cancel, (err, result) => {
      if (err) console.log(err);
    });
  } else {
    const findUser = `select * from users where username = '${username}'`;
    con.query(findUser, (err, result) => {
      if (err) console.log(err);
      if (result.length > 0) {
        const total_payout = parseInt(result[0].total_payout);

        const updateBal = `update users set total_payout = '${
          total_payout + parseInt(amount)
        }' where username = '${username}' `;
        const updateStats = `update payouts set status = '${status}' where id = '${id}' `;
        con.query(updateBal, (err, result) => {
          if (err) console.log(err);
        });
        con.query(updateStats, (err, result) => {
          if (err) console.log(err);
        });
      }
    });
  }
  res.send("done");
});

app.post("/mine", async (req, res) => {
  const { email } = req.body;

  const date = new Date();
  const date_obj = {
    // object Construtionj
    month: date.getUTCMonth() + 1,
    date: date.getUTCDate(),
  };

  const update_cDate = () => {
    var t = "" + date_obj.date + "";
    if (t.length == 1)
      return parseInt(date_obj.month + "" + 0 + "" + date_obj.date);
    else {
      return parseInt(date_obj.month + "" + date_obj.date);
    }
  }; //  Date

  const getUser = `select * from users where email = '${email}'`;
  con.query(getUser, (err, result) => {
    if (err) console.log(err);
    if (result.length > 0) {
      const get_last_login = result[0].login;
      const user_cBal = result[0].balance;

      // find deposit and filtering the active one
      const findDepo = `select * from deposits where email = '${email}' and status = 'confirmed'`;
      con.query(findDepo, (err, result) => {
        if (err) console.log(err);
        const fincActiveDepo = result.filter((i) => {
          return i.active <= 20;
        });
        let total_investment = 0;
        for (i of fincActiveDepo) {
          total_investment += parseInt(i.amount);
        }

        const mining_formula = async (pLog) => {
          const days = update_cDate() - pLog;

          // function for updating deposit active days
          const updateActive = async (id, days) => {
            // const getActive = await db.collection('deposits').find({id}).toArray();
            const getActive = `select * from deposits where id ='${id}'`;
            con.query(getActive, (err, result) => {
              if (err) console.log(err);
              const getActiveDays = parseInt(result[0].active);
              const updateActive = `update deposits set active = '${
                getActiveDays + parseInt(days)
              }' where id = '${id}'`;
              con.query(updateActive, (err, result) => {
                if (err) console.log(err);
              });
            });
          };

          if (days !== 0) {
            for (i of fincActiveDepo) {
              updateActive(i.id, days);
            }
          }

          if (days > 30) {
            const commission = total_investment * (10 / 100) * (days - 70);
            // db.collection('users').updateOne({email}, {$set: {balance: parseInt(user_cBal) + commission, login: update_cDate()}});
            const mine = `update users set balance = '${
              parseInt(user_cBal) + commission
            }' and login = '${update_cDate()}' where email = '${email}'`;
            con.query(mine, (err, result) => {
              if (err) console.log(err);
            });
          } else {
            const commission = total_investment * (10 / 100) * days;
            const mine = `update users set balance = '${
              parseInt(user_cBal) + commission
            }', login = '${update_cDate()}' where email = '${email}'`;
            con.query(mine, (err, result) => {
              if (err) console.log(err);
            });
          }
          const getUser2 = `select * from users where email = '${email}'`;
          con.query(getUser2, (err, result) => {
            if (err) console.log(err);
            res.send(result);
          });
        };
        mining_formula(get_last_login);
      });
    }
  });
});

// con.end();
app.listen(port, () => {
  console.log("Mayowa Api Running...");
});

// Signup Users
// app.post("/signup", async (req, res) => {
//   const { username, email, password, upline } = req.body;
//   const countUsers = await (
//     await db.collection("users").find({}).toArray()
//   ).length;
//   const hashPassword = await bcrypt.hash(password, 10);

//   const new_user = {
//     id: countUsers + makeid(10),
//     username,
//     email,
//     password: hashPassword,
//     upline,
//     recharge: 0,
//     deposit: 0,
//     ref: 0,
//     withrawal: 0,
//   };

//   //   generate random id text
//   function makeid(length) {
//     var result = "";
//     var characters =
//       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     var charactersLength = characters.length;
//     for (var i = 0; i < length; i++) {
//       result += characters.charAt(Math.floor(Math.random() * charactersLength));
//     }
//     return result;
//   }

//   //   find username
//   const findUsername = (
//     await db.collection("users").find({ username }).toArray()
//   ).length;
//   //   find email
//   const findEmail = (await db.collection("users").find({ email }).toArray())
//     .length;

//   //   modify searches
//   //   check username count
//   if (findUsername > 0) {
//     return res.send("username err");
//   } else {
//     // check email length
//     if (findEmail > 0) {
//       return res.send("email err");
//     } else {
//       // if no email and username exists insert data.
//       db.collection("users").insertOne(new_user, (err, result) => {
//         if (err) console.log(err);
//         res.send(new_user);
//       });

//       const up = upline == null ? "null".length : upline.toString().length;
//       console.log(up);
//       if (up > 9) {
//         //   Update Upline Refs
//         const getUpline = await db
//           .collection("users")
//           .find({ id: upline })
//           .toArray();
//         const refs = parseInt(getUpline[0].ref);
//         db.collection("users").updateOne(
//           { id: upline },
//           { $set: { ref: refs + 1 } }
//         );
//       }
//     }
//   }
// });

// // LOGIN
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;

//   const findUsername = await db
//     .collection("users")
//     .find({ username })
//     .toArray();

//   const countUsername = findUsername.length;

//   if (countUsername > 0) {
//     const hashPassword = findUsername[0].password;

//     const comparePass = await bcrypt.compare(password, hashPassword);
//     if (comparePass) {
//       res.send("loged in");
//     } else {
//       res.send("invalid");
//     }
//   } else {
//     res.send("invalid");
//   }
// });

// app.listen(port, () => {
//   console.log("Running on port 4000");
// });
