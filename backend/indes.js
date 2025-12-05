while(true)
{
    const res = await fetch('http://72.61.235.204:8000/health');
    const data = await res.json();
    console.log(data);
    
}