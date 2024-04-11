const mongo = require("mongodb");
const url = "mongodb+srv://user:user123@clusterhw.greypvj.mongodb.net/?retryWrites=true&w=majority&appName=ClusterHW";
const client = new mongo.MongoClient(url,{useNewUrlParser:true, useUnifiedTopology:true});
let db = null;
async function inDB(){
    await client.connect();
    console.log("連線成功");
    db = client.db("MessageBoard"); // MessageBoard 留言板訊息
    console.log("連線database成功");
};
inDB();

const express = require("express");
const app = express();
const session = require("express-session");
app.use(session({
    secret:"anything",
    resave:false,
    saveUnitialized:true
}));
app.set("view engine","ejs");
app.set("views","./views");
app.use(express.static("./public"));
app.use(express.urlencoded({extended:true}));

// 首頁路由 http://localhost:3000
app.get("/", function(req,res){
    res.render("home.ejs");
})
// 會員留言板的路由 http://localhost:3000/member
app.get("/member", async function(req, res){
    // 必須登入才能進來 看session有沒有存取資料 
    const user = req.session.member;//null 就不行
    if(!user){
        // 回首頁
        res.redirect("/");
        return;
    }
    // 會員姓名客製化
    const name = req.session.member.name;
    // 提取(所有)留言紀錄
    const collection = db.collection("message-board");    
    let result = await collection.find({});    
    let data = [];    
    await result.forEach(function(m){
        data.push(m)
    }); 
    res.render("message-board.ejs",{data:data, name:name});
});
// error的路由 http://localhost:3000/error
app.get("/error", function(req,res){
    const msg = req.query.msg;
    res.render("error.ejs",{msg:msg});
})
// 登出會員
app.get("/logout", function(req,res){
    // 移除session的會員資料 null 回首頁
    req.session.member = null;
    res.redirect("/");
})
// 註冊會員的路由
app.post("/signin", async function(req,res){
    // 取得三個資料
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    console.log("取得資料成功");
    // 如果有相同的email 給他到錯誤頁面和錯誤訊息
    const collection = db.collection("member");
    let result = await collection.findOne({
        email:email
    });
    // 檢查
    if (result!==null){
        res.redirect("/error?msg=信箱重複註冊 請回首頁");
        return;
    };
    // 如果沒有一樣的 新增到資料庫新的集合:會員member
    let newone = await collection.insertOne({
        name:name,
        email:email,
        password:password
    });
    res.redirect("/");
});
// 登入會員的路由
app.post("/login", async function(req,res){
    // 取得email password
    const email = req.body.email;
    const password = req.body.password;
    // check member集合 有相同的才登入
    const collection = db.collection("member");
    let result = await collection.findOne({
        $and:[{email:email},{password:password}]
    });
    // 檢查
    if(result===null){
        console.log("/error?msg=登入的帳號密碼錯誤");
        res.redirect("/error?msg=登入的帳號密碼錯誤");
        return;
    }
    // session存取登入的會員資料 req.session.member
    req.session.member = result;
    res.redirect("/member");
})
// 新增留言的路由
app.post("/message", async function(req,res){
    const name = req.session.member.name;
    const message = req.body.message;
    const timelock = Date();
    // 存到資料庫
    const collection = db.collection("message-board");
    let result = collection.insertOne({
        name:name,
        message:message,
        timelock:timelock
    });   
    res.redirect("/member");
});
// http://localhost:3000
app.listen(3000, function(){console.log("Server connected !")})