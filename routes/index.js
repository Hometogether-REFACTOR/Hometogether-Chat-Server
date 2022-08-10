const router=require('express').Router();


//* sample front routing

router.get('/1', (req, res)=>{
    res.render('client',{})
})
router.get('/2', (req, res)=>{
    res.render('client2',{})
})
router.get('/3', (req, res)=>{
    res.render('client3',{})
})
// router.get('/2', (req, res)=>{
//     res.render('client2',{})
// })
// const { models } = require('mongoose');
// const Todo=require('../models/chats');

// router.get('/login', async (req,res, next)=>{
//     try{
//         const io=req.app.get("io");
//         io.sockets.emit("login",{});
//     } catch(err){
//         console.log(error);
//         next(error);
//     }
// })

// router.get('/', (req, res)=>{
//     Todo.findAll()
//         .then((todos)=>{
//             if(!todos.length){
//                 return res.status(404).send({err:'Todo not found'});
//             }
//             res.send(`find successfully: ${todos}`);
//         })
//         .catch(err=>res.status(500).send(err));
// });

// router.get('/todoId/:todoId', (req, res)=>{
//     Todo.findByTodoId(req.params.todoId)
//         .then((todo)=>{
//             if(!todo){
//                 return res.status(404).send({err:'Todo not found'});
//             }
//             res.send(`find successfully: ${todo}`);
//         })
//         .catch(err=>res.status(500).send(err));
// });

// router.post('/', (req, res)=>{
//     Todo.create(req.body)
//         .then(todo=>{
//             console.log(todo);;
//             res.send(todo)
//         })
//         .catch(err=>res.status(500).send(err));
// });

// router.put('/todoId/:todoId', (req, res)=>{
//     Todo.updateByTodoId(req.params.todoId, req.body)
//         .then(todo=>res.send(todo))
//         .catch(err=>res.status(500).send(err));
// });

// router.delete('/todoId/:todoId', (req, res)=>{
//     Todo.deleteByTodoId(req.params.todoId)
//         .then(()=>res.sendStatus(200))
//         .catch(err=>res.status(500).send(err));
// });

module.exports=router;
