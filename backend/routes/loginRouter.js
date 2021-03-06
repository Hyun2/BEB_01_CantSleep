const express = require("express");
const router = express.Router();
const db = require("../models");
const lightwallet = require("eth-lightwallet");
const Web3 = require("web3");
const web3 = new Web3("HTTP://127.0.0.1:7545");
const { User, Users } = require("../models");
const bcrypt = require("bcrypt");

router.post("/user", async (req, res) => {
  // 포스트맨에서 userName, password를 넣으면
  let reqUserName, reqPassword;
  reqUserName = req.body.userName;
  reqPassword = req.body.password;

  // user에서 find로 userName을 찾고,
  User.findOrCreate({
    where: {
      userName: reqUserName,
    },
    default: {
      password: reqPassword,
    },
  }).then(([user, created]) => {
    if (!created) {
      // 있으면 있다고 응답
      res.status(409).send("User exists");
      // 없으면 DB에 저장
    } else {
      // 니모닉코드 생성
      let mnemonic;
      mnemonic = lightwallet.keystore.generateRandomSeed();
      // 생성된 니모닉코드와 password로 keyStore, address 생성
      lightwallet.keystore.createVault(
        {
          password: reqPassword,
          seedPhrase: mnemonic,
          hdPathString: "m/0'/0'/0'",
        },
        function (err, ks) {
          ks.keyFromPassword(reqPassword, function (err, pwDerivedKey) {
            ks.generateNewAddress(pwDerivedKey, 1);

            let address = ks.getAddresses().toString();
            let keyStore = ks.serialize();
            let prv_key = ks.exportPrivateKey(address, pwDerivedKey);
            
            //네트워크에 지갑을 등록하하는 과정 
            web3.eth.accounts.wallet.add(prv_key);
  
            User.update({
              password: reqPassword,
              address: address,
              privateKey: prv_key,
              mnemonicWord : mnemonic 
            }, {
              where: {
                userName: reqUserName
              }
            })
              .then((result) => {
                // 주소를 보여준다
                res.json(address);
              })
              .catch((err) => {
                console.error(err);
              });
          });
        }
      );
    }
  });
});

// router.post("/register", async (req, res) => {
//   const { username, password } = req.body;

//   bcrypt.hash(password, saltRounds, async (err, hash) => {
//     try {
//       await Users.create({
//         userName: username,
//         password: hash,
//       });
//       res.json({ message: "회원가입 성공" });
//     } catch (e) {
//       res.json({ message: "회원가입 실패" });
//     }
//   });
// });


module.exports = router;
