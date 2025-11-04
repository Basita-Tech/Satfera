import React from "react";
import {useNavigate} from  "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";



const UserDashboard=(()=>{
    const navigate=useNavigate();
    const user=JSON.parse(localStorage.getItem("user"))



    const handleLogout=()=>{
        localStorage.clear()
        navigate("/login")
    }

    return(
        <div className="p-6">
      <h1 className="text-2xl font-bold">User Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome, <strong>{user?.firstName || "User"}</strong> 👋
      </p>
      <button
        onClick={handleLogout}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
    )

})


export default UserDashboard



