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

module.exports=router;
