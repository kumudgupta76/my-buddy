import logo from './logo.svg';
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Base from './components/Base';
import CountdownTimer from './components/CountdownTimer';
import Timer from './components/Timer';
import Layout from './components/Layout';
import NoPage from './components/NoPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Base />} />
          <Route path="timer" element={<CountdownTimer />} />
          <Route path="contact" element={<Timer />} />
          <Route path="*" element={<NoPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
