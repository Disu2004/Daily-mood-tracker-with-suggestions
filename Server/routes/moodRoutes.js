const express = require('express');
const router = express.Router();
const { saveMoodAction , suggestion  , detailedSuggetion, userNeed, savesuggestion} = require('../controllers/moodcontroller');

router.post('/saveMoodAction', saveMoodAction);
router.post('/suggestion', suggestion);
router.post('/detailedsuggestions', detailedSuggetion);
router.post('/userneed' , userNeed);
router.post('/savesuggestion',savesuggestion)
module.exports = router;
