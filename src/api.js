import express from 'express';
import axios from 'axios';


const app = express();
app.use(express.json())
app.get("/api/hello", (req, res) => {
  res.json({ hello: "world" });
});

app.post("/api/startkyc", async (req, res) => {
  const response = await axios.post(`${import.meta.env.ZKPID_SERVER}:${import.meta.env.ZKPID_SERVER_PORT}/api/startkyc`,
    req.body,{
      headers: {
      "Content-Type": "application/json",
      'Accept': "*/*"
    }})

  const data = response.data;
  res.json(response.data);
});

export const handler = app;
