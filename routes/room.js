var express = require('express');
var router = express.Router();

/* GET room creating. */
router.get('/room/:id/:key', function(req, res, next) {
  res.render('room', { id: req.params.id, key: req.params.key });
});

module.exports = router;
