import React,{createContext,useState,useEffect, Children} from "react"


export const AuthContextr=createContext()


export const AuthProvider=({children})=>{
    const [user,setUser]=useState(null)
    const [token,setToken]=useState(null)
    const [role,setRole]=useState(null)




    useEffect(()=>{
        const savedToken=localStorage.getItem("authToken")
        const savedUser=localStorage.getItem("user")
        const savedRole=localStorage.getItem("userRole")


    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedRole) setRole(savedRole);
    },[])


    const login=(userData)=>{
        localStorage.setItem("authToken",userData.token)
        localStorage.setItem("userRole",userData.Role)
        localStorage.setItem("user",JSON.stringify(userData))

    setToken(userData.token);
    setRole(userData.role);
    setUser(userData);
    }


    // ✅ Logout
  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setUser(null);
  };


  return(
    <AuthContextr.Provider value={{user,token,role,login,logout}}>
        {children}
    </AuthContextr.Provider>

  )
}