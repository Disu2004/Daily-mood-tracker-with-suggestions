    import React, { useState } from 'react';
    import './CSS/Form.css';
    import { useNavigate } from 'react-router-dom';

    const Login = () => {
        const navigate = useNavigate();
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');

        const handleLogin = (e) => {
            e.preventDefault();
            fetch(`http://localhost:8000/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
                .then((res) => res.json())
                .then((data) => {
                    alert(data.message);
                    
                    console.log(data.id)
                    console.log(data.accessToken)
                   
                    if (data.id && data.accessToken) {
                        localStorage.setItem("accessToken", data.accessToken);
                        localStorage.setItem("userId", data.id);
                        navigate('/home');
                    }
                })
                .catch((err) => console.log("Login error:", err));
        };

        return (
            <div>
                <form onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input type="password" id="password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit">Login</button>
                </form>

                <div className="register-prompt">
                    <p style={{color:"black"}}>
                        Don't have an account?{' '}
                        <span className="register-link" onClick={() => navigate('/register')}>
                            Register here
                        </span>
                    </p>
                </div>

            </div>
        );
    };

    export default Login;
