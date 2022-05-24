//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const session = require('express-session')
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')
var findOrCreate = require('mongoose-findorcreate')
require('dotenv').config()

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use((req, res, next) =>{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
})

app.use(session({
  secret: process.env.PASSWORD,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGOSTRING);


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  setor: Array,
  cargo: Array,
  dadosPessoais: Array,
  unidade: Array
});

const produtoSchema = new mongoose.Schema({
  nome: String,
  codigo: String,
  ncm: Number,
  quantidade: Number,
  lote: Array,
  gtin: Number,
  un: String,
  categoria: String,
  utilizacao: String,
  familia: String,
  origem: String,
  nf: Number
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);
const Produto = mongoose.model('Produto', produtoSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
  done(null, user.id)
})

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  })
});


////////////////////////////////////////////////////////////
app.get('/', function(req, res){
  res.render('home');
})

///////////////////////////////////////////////////////////////

app.get('/login', function(req, res){
  res.render('login');
})

app.post('/login', function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      res.send('Erro')
    } else{
      passport.authenticate('local')(req, res, function(){
        if(user){
          res.redirect('/inicio')
        } else{
          res.send('Negative')
        }
      })
    }
  })

});
//////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////
app.get('/register', function(req, res){
  if(req.isAuthenticated()){
    res.render('register');
  }else{
    res.redirect('/login')
  };
});

app.post('/register', function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      res.send(err)
    } else{
      User.updateMany(
        {"username": req.body.username },
        {$set: {
          'dadosPessoais': [{nome: req.body.nome}, {nascimento: req.body.data}, {cpf: req.body.cpf}, {rg: req.body.rg}],
          'setor': [{setorId: req.body.setores}, {setorDescri: req.body.setorDescri}],
          'cargo': [{cargoId: req.body.cargos}, {cargoDescri: req.body.cargoDescri}],
          'unidade': [{unidadeId: req.body.unidade}, {unidadeDescri: req.body.unidadeDescri}]
        }
        },
        {
            returnNewDocument: true
        }
    , function( error, result){
      if(error){
        res.send('erro1')
      } else{
        passport.authenticate('local')(req, res, function(){
          res.redirect('/inicio')
        })
      }
    });
    }
  })

  })

///////////////////////////////////////////////////////////////
app.get('/inicio', function(req, res){
    res.render('inicio');
});

///////////////////////////////////////////////////////////////
app.get('/submit', function(req, res){
  res.render('submit');
});

///////////////////////////////////////////////////////////////
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

/////////////////////////////////////////////////////////
app.get('/ativos', function(req, res){
  if(req.isAuthenticated()){
    User.find({}, function(err, usuario){
     res.render("ativos", {
       usuario: usuario,
     });
   });
  }else{
    res.redirect('/login')
  }
})

/////////////////////////////////////////////////////////
app.get("/dados/:dadosId", function(req, res){
  if(req.isAuthenticated()){
    User.findOne({_id: req.params.dadosId}, function(err, usuario){
      res.render('dados', {
        userId: usuario._id,
        username: usuario.username,
        nome: usuario.dadosPessoais[0].nome,
        data: usuario.dadosPessoais[1].nascimento,
        cpf: usuario.dadosPessoais[2].cpf,
        rg: usuario.dadosPessoais[3].rg,
        setor: usuario.setor[1].setorDescri,
        cargo: usuario.cargo[1].cargoDescri,
        unidade: usuario.unidade[1].unidadeDescri
      })
    });
  }else{
    res.redirect('/login');
  }
})

app.post("/dados", function(req, res){
  User.updateMany(
    {"username": req.body.username },
    {$set: {
      'dadosPessoais': [{nome: req.body.nome}, {nascimento: req.body.data}, {cpf: req.body.cpf}, {rg: req.body.rg}],
      'setor': [{setorId: req.body.setores}, {setorDescri: req.body.setorDescri}],
      'cargo': [{cargoId: req.body.cargos}, {cargoDescri: req.body.cargoDescri}],
      'unidade': [{unidadeId: req.body.unidade}, {unidadeDescri: req.body.unidadeDescri}]
    }
    },
    {
        returnNewDocument: true
    }
, function( error, result){
  if(error){
    res.send('erro1')
  } else{
    res.redirect('/inicio')
  }
});
})

//////////////////////////////////////////////////////////////////////
//Delete usuários da página dados.
app.post('/deleteUser', function(req, res){
  User.deleteOne({username: req.body.username}, function(err){
    if(err){
      console.log(err)
      res.send('Erro ao excluir')
    } else {
      res.redirect('/ativos')
    }
  })
})

///////////////////////////////////////////////////////
app.get('/cadastroproduto', function(req, res){
    res.render('cadastroproduto')
})

app.post('/cadastroproduto', function(req, res){
  const produto = new Produto({
    nome: req.body.descri,
    codigo: req.body.codigo,
    ean: req.body.ean,
    ca: req.body.ca,
    ncm: req.body.ncm,
    un: req.body.un,
    gtin: req.body.gtin,
    categoria: req.body.categoria,
    utilizacao: req.body.utilizacao,
    familia: req.body.familia,
    origem: req.body.origem
  })
  produto.save(function(err){
    if(err){
      console.log(err);
    } else {
      res.redirect('/produtos');
    }
  });
})

//////////////////////////////////////////////////
app.get('/produtos', function(req, res){
    Produto.find({}, function(err, produto){
     res.render("produtos", {
       produto: produto,
     });
   });
})

//////////////////////////////////////////////////
app.get('/entradaproduto', function(req, res){
    Produto.find({}, function(err, produto){
     res.render("entradaproduto", {
       produto: produto,
     });
   });
})

app.post('/entradaproduto', function(req, res){
  let d = new Date(req.body.validade)
  let validade = ((('0' + (d.getDate() + 1)).slice(-2)) + '/' + (('0' + (d.getMonth() + 1)).slice(-2)) + '/' + d.getFullYear())
  Produto.updateOne(
    {"nome": req.body.nome },
    {
      $push: {'lote': [{numLote: req.body.lote}, {validade: validade}, {quantidadeLote: req.body.quantidade}, {numeroNota: req.body.nf}]},
      $inc: {'quantidade': req.body.quantidade}
    },
    {
        returnNewDocument: true
    },
  function( error, result){
  if(error){
    res.send('erro1')
  } else{
    res.redirect('/produtos')
  }
});
})

//////////////////////////////////////////////////

app.get('/saidaproduto', function(req, res){
    Produto.find({'nome': req.query.nome}, function(err, produto){
     res.render("saidaproduto", {
       produto: produto,
     });
   });
})

app.post('/saidaproduto', function(req, res){
  Produto.updateOne(
    {"nome": req.body.nome },
    {
      $inc: {'quantidade': (req.body.quantidade) * -1}
    },
    {
        returnNewDocument: true
    },
  function( error, result){
  if(error){
    res.send('Erro na saída de produto')
  } else{
    res.redirect('/produtos')
  }
});
})
////////////////////////////////////////////////

app.get('/procurasaidaproduto', function(req, res){
    Produto.find({}, function(err, produto){
     res.render("procurasaidaproduto", {
       produto: produto,
     });
   });
})

////////////////////////////////////////////////

app.get("/SJ50MM", (req, res) => {
  res.render('ordensmanut/SJ50MM')
});

///////////////////////////////////////

app.get("/ordemprevcria", (req, res) => {
  res.render('ordemprevcria')
});

//////////////////////////////////////////
app.get("/ordemprevlista", (req, res) => {
  res.render('ordensmanut/ordemprevlista')
});


////////////////////////////////////////////////

app.listen(5000, function() {
  console.log("Server started on port 5000");
});

