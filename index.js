const express=require('express')
const app=express()
const sqlite3=require('sqlite3')
const path=require('path')
const {open}=require('sqlite')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const dbpath=path.join(__dirname,'goodreads.db')
let db=null
app.use(express.json())

const initializeDbAndServer= async ()=>{
   try{
    db = await open({
        filename:dbpath,
        driver:sqlite3.Database
    })
    app.listen(3000,()=>{
        console.log(`server is running at localhost:3000`)
    })
   }catch(e){
    console.log(`error at '${e.message}'`)
    process.exit(1)
   }
}
initializeDbAndServer()

const authenticate=(request,response,next)=>{
    let jwtToken
    const authHeader=request.headers["authorization"]
    
    if(authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1]
    }
    console.log(jwt)
    if(jwtToken===undefined){
        response.send('invalid token')
        response.status(400)
    }else{
        jwt.verify(jwtToken,'jlfjdfj',(error,payLoad)=>{
            if(error){
                response.send('invalid token')
                response.status(400)
            }else{
                request.username=payLoad.username
                next()
            }
        })
    }
}

app.get('/books/',authenticate,async(request,response)=>{
    const query=`select * from book`
    const result=await db.all(query)
    response.send(result)
})

app.get('/users/',authenticate,async(request,response)=>{
    const query=`select * from user`
    const result=await db.all(query)
    response.send(result)
})

app.get('/books/:bookId',authenticate,async(request,response)=>{
    const {bookId}=request.params
    const query=`select * from book where book_id='${bookId}'`
    const result=await db.get(query)
    response.send(result)
})

app.post('/books/',authenticate,async(request,response)=>{
    const {name,author_name,published_year}=request.body
    const query=`insert into book(name,author_name,published_year) values ('${name}','${author_name}',${published_year});`
    const result=await db.run(query)
    console.log(result)
    const {lastID}=result
    response.send({lastID})
})

app.delete('/books/:bookId',authenticate,async(request,response)=>{
    const {bookId}=request.params
    const query=`delete from book where book_id=${bookId}`
    const result=await db.run(query)
    response.send('deleted successfully')
})

app.post('/login/',async(request,response)=>{
    const {username,password}=request.body
    const query=`select * from user where username='${username}'`
    
    const result=await db.get(query)
   
    if(result!==undefined){
        const passwordMatched=await bcrypt.compare(password,result.password)
       
        if(passwordMatched){
            const payLoad={username}
           
            const jwtToken=await jwt.sign(payLoad,'jlfjdfj')
            response.send(jwtToken)
        }else{
            response.send('invalid password')
            response.status(400)
        }
       
    }else{
        response.send('invalid username')
        response.send(404)
    }
})

app.post('/register/',async(request,response)=>{
    const {username,password,location}=request.body
    const query=`select * from user where username='${username}'`
    const result=await db.get(query)
    if(result===undefined){
        const hashedPassword=await bcrypt.hash(password,10)
        const query=`insert into user(username,password,location) values('${username}','${hashedPassword}','${location}');`
        const res=await db.run(query)
        response.send('registered successfully')
    }else{
        response.send('user already exists')
        response.status(400)
    }
})

