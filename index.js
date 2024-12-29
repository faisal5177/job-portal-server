require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5001;

const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET, POST, PUT, DELETE",
  credentials: true,
};

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


const logger = (req, res, next) => {
  console.log(`inside the logger`);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if(!token) {
    return res.status(401).send({message:'unAuthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8kzkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   
    
    // jobs related apis
    const jobsCollection = client.db('jobPortal').collection('jobs');
    const jobApplicationCollection = client.db('jobPortal').collection('job_applications');

    // Auth related APIs
     app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'5h'});
      res
         .cookie('token', token,{
         httpOnly: true,
         secure: false,
      })
      .send({success: true});
     })
    
    // jobs related APIs
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      let query = {};
      if(email) {
        query = { hr_email: email }
      }
      const cursor = jobsCollection.find(); 
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/jobs', async(req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.get('/job-application/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId }
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
  })

    app.get('/job-application', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'});
      }

      const result = await jobApplicationCollection.find(query).toArray();
    
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.location = job.location;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });

      // Delete job application by ID
      app.delete('/job-application/:id', async (req, res) => {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await jobApplicationCollection.deleteOne(query);
           res.send(result)
      });

    app.post('/job-application', async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Job is falling from sky');
});

app.listen(port, () => {
  console.log(`Job is waiting at: ${port}`);
});
