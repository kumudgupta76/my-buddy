import logo from './logo.svg';
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Base from './components/Base';
import CountdownTimer from './components/CountdownTimer';
import Timer from './components/Timer';

const App = () => {
  return (
    <CountdownTimer></CountdownTimer>
  );
};

export default App;
