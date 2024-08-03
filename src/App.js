import logo from './logo.svg';
import './App.css';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Base from './components/Base';
import CountdownTimer from './components/timer/CountdownTimer';
import Timer from './components/Timer';
import Layout from './components/Layout';
import NoPage from './components/NoPage';
import ExpenseTracker from './components/expense/ExpenseTracker';
import CalendarComponent from './components/Calander';
import Home from './components/Home';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="my-buddy/home" element={<Home />} />
          <Route path="my-buddy/timer" element={<CountdownTimer />} />
          <Route path="my-buddy/contact" element={<Timer />} />
          <Route path="my-buddy/cal" element={<CalendarComponent />} />
          <Route path="*" element={<NoPage />} />
          <Route path="my-buddy/expense" element={<ExpenseTracker />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
