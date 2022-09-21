//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
const ejs = require("ejs");
const _ = require("lodash");
// const md5=require("md5");
// const bcrypt=require("bcrypt");
// const saltRounds=10;
const app = express();
const passport=require('passport');
const session=require('express-session');
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our Little Secret",
  resave :false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleID:String,
  secret:String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



//const secret="Thisisourlittlesecret.";
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
//
 const User =new mongoose.model("User",userSchema);

 passport.use(User.createStrategy());

 passport.serializeUser(function(user, cb) {
   process.nextTick(function() {
     return cb(null, {
       id: user.id,
       username: user.username,
       picture: user.picture
     });
   });
 });

 passport.deserializeUser(function(user, cb) {
   process.nextTick(function() {
     return cb(null, user);
   });
 });
//...................................................................
 passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"

  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/",function(req,res){
  res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
  res.render("login");
})

app.get("/register",function(req,res){
  res.render("register");
})

// app.get("/logout",function(req,res){
//   req.logout();
//   res.redirect("/");
// });

app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}}, function(err,found){
    if(err)
    console.log(err);
    else{
      if(found){
        res.render("secrets",{userswithsecrets : found});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated())
  res.render("submit");
  else
  res.redirect("/login");
});


app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;
  User.findById(req.user.id,function(err,found){
    if(err)
    console.log(err);
    else{
      if(found){
        found.secret=submittedSecret;
        found.save(function(){
          res.redirect("/secrets")
        });

      }
    }
  });
});




app.post("/register",function(req,res){

//   bcrypt.hash(req.body.password,saltRounds,function(err,hash)
// {
//   const newUser= new User({
//     email:req.body.username,
//     //password:md5(req.body.password)
//     password:hash
//   });
//   newUser.save(function(err){
//     if(err)
//     console.log(err);
//     else
//     res.render("secrets");
//
//   });
// });

User.register({username:req.body.username},req.body.password,function(err,user){
if (err){
  console.log(err);
  res.redirect("/register");
}
else{
  passport.authenticate("local")(req,res,function(){
    res.redirect("/secrets");
  });
}

});

});

app.post("/login",function(req,res){
  // const user=req.body.username;
  // const password=req.body.password;
  //
  // User.findOne({email:user},function(err,found){
  //   if(err)
  //   console.log(err);
  //   else{
  //     if(found)
  //     {
  //
  //       bcrypt.compare(password,found.password,function(err,result){
  //
  //         if(result===true)
  //         res.render("secrets");
  //         else
  //         console.log("fail");
  //       })
  //
  //
  //
  //     }
  //   }
  // });


  const user =new User({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user,function(err){
    if(err)
    console.log(err);
    else
    {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });
});


app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
