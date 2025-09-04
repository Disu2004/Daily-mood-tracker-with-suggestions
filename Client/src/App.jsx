import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Registration from './components/Registration';
import Login from './components/Login';
// import MoodQuestions from './pages/MoodQuestions';
import Home from './components/Home';
import Questions from './components/Questions';
// import ActivityPage from './pages/ActivityPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/home" element={<Home />} />
        <Route path="/questions" element={<Questions />} />
      </Routes>
    </Router>
  );
};

export default App;
