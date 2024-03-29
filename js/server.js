const e = require('express');
const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const mysql = require('mysql')

const port = 6969;
const server = http.createServer(express)
const wss = new WebSocket.Server({ server })

const players = []
const grids = []
const scores = []
let turn = 0

let p1Count = 0
let p2Count = 0

let jogos = 0
let vitorias = 0
let derrotas = 0

function updateDB(user,point){
  console.log('readScores...')
  let con = mysql.createConnection({
    host: "localhost",
    user: "Jose",
    password: "qwerty",
    database: "battlechips"
  })

  user = user.split(" ")
  user = user[1].toString()

  let query = "SELECT jogos, vitorias, derrotas FROM score WHERE nome=" + mysql.escape(user)
  console.log(query)

  con.connect(function(err) {
    if (err) throw err
    con.query(query, [user], function (err, result) {
      if (err) throw err
      jogos = result[0].jogos
      vitorias = result[0].vitorias
      derrotas = result[0].derrotas
      
      if(point === true){
        //update if winner
        let sql = "UPDATE score SET jogos=" + (jogos + 1) + ", vitorias=" + (vitorias + 1) + ", derrotas=" + derrotas + " WHERE nome=" + mysql.escape(user)
        con.query(sql, function (err, result) {
          if (err) throw err
          console.log(result.affectedRows + " record(s) updated")
        })
        
      }else{
        //update if loser
        let sql = "UPDATE score SET jogos=" + (jogos + 1) + ", vitorias=" + vitorias + ", derrotas=" + (derrotas + 1) + " WHERE nome=" + mysql.escape(user)
        con.query(sql, function (err, result) {
          if (err) throw err
          console.log(result.affectedRows + " record(s) updated")
        })

      }
    })
  })
}

wss.on('connection', function connection(ws) {
  if(players.length === 2){
    console.log('to much players')
    ws.close()
    return
  }
  if(p1Count === 17 || p2Count === 17){
    return
  }
  players.push(ws)
  console.log(`Client connected.`)

  //First turn of the game
  if(players.length === 2){
    players[0].send(JSON.stringify("t"))
  }
  ws.onmessage = message => {
    data = JSON.parse(message.data)
    dataStr = data.toString()

    console.log('data: ' + data)

    if(dataStr.includes('-')){
      scores.push(data.slice(1,20))
    }else{
      if(grids.length < 2){
        grids.push(data)
      }else{
        if(ws === players[0] && turn === 0){
          //1st number = player / 2nd number = hit/miss
          turn = 1
          //player1
          if(grids[1].includes(data)){
            players[0].send(JSON.stringify('01 ' + data))
            players[1].send(JSON.stringify('11 ' + data))
            p1Count++
            //player1 hit
          }else{
            players[0].send(JSON.stringify('00 ' + data))
            players[1].send(JSON.stringify('10 ' + data))
            //player1 miss
          }
        }else if(ws === players[1] && turn === 1){
          turn = 0
          //player2
          if(grids[0].includes(data)){
            players[0].send(JSON.stringify('11 ' + data))
            players[1].send(JSON.stringify('01 ' + data))
            p2Count++
            //player2 hit
          }else{
            players[0].send(JSON.stringify('10 ' + data))
            players[1].send(JSON.stringify('00 ' + data))
            //player2 miss
          }
        }
  
        //disconnect players
        function discPlayers(){
          console.log("Players Disconnected")
          for(x = 0;x<2;x++){
            players.pop()
            grids.pop()
          }
          console.log(players)
          console.log(grids)
          p1Count = 0
          p2Count = 0
          turn = 0
        }
  
        if(p1Count === 17 || p2Count === 17){
          if(p1Count === 17){
            players[0].send(JSON.stringify('p1'))
            players[1].send(JSON.stringify('p2'))
            updateDB(scores[0],true)
            updateDB(scores[1],false)
          }else if(p2Count === 17){
            players[0].send(JSON.stringify('p2'))
            players[1].send(JSON.stringify('p1'))
            updateDB(scores[0],false)
            updateDB(scores[1],true)
          }
          discPlayers()
        }
  
        if(data === 'closing'){
          discPlayers()
        }
  
        if(players.length === 2){
          players[turn].send(JSON.stringify('t'))
        } 
      }
    } 
  }
})

server.listen(port,'192.168.1.90', function() {
  console.log(`Server is listening on ${port}!`)
})
