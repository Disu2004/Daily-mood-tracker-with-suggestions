import React, { useState } from 'react';
import './CSS/Form.css';
import { useNavigate } from 'react-router-dom';

const Registration = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confpass, setconfpass] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confpass) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confpass 
        })
      });
      console.log(confpass)
      const data = await res.json();
      alert(data.message);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userId", data.id);
      if (data.status) navigate('/questions');
    } catch (err) {
      console.error('Registration error:', err);
      alert('Registration failed');
    }
  };

  return (
    <div>
      <form method="POST">
        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confpass">Confirm Password:</label>
          <input
            type="password"
            id="confpass"
            required
            value={confpass}
            onChange={(e) => setconfpass(e.target.value)}
          />
        </div>
        <button type="submit" onClick={handleRegister}>
          Register
        </button>
      </form>
    </div>
  );
};

export default Registration;
