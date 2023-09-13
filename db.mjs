import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
    // if we're in PRODUCTION mode, then read the configration from a file
    // use blocking file io to do this...
    const fn = path.join(__dirname, 'config.json');
    const data = fs.readFileSync(fn);

    // our configuration file will be in json, so parse it and set the
    // conenction string appropriately!
    const conf = JSON.parse(data);
    dbconf = conf.dbconf;
} else {
    // if we're not in PRODUCTION mode, then use
    dbconf = 'mongodb://localhost/final';
}

const mongooseOpts = {
    useNewUrlParser: true,  
    useUnifiedTopology: true
};
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    Team: String,
    GP: Number,
    TOI: Number,
    W: Number,
    L: Number,
    OTL: Number,
    ROW: Number,
    Points: Number,
    'Point %': Number,
    CF: Number,
    CA: Number,
    CFp: Number,
    FF: Number,
    FA: Number,
    'FF%': Number,
    SF: Number,
    SA: Number,
    SFp: Number,
    GF: Number,
    GA: Number,
    GFp: Number,
    xGF: Number,
    xGA: Number,
    xGFp: Number,
    SCF: Number,
    SCA: Number,
    SCFp: Number,
    HDCF: Number,
    HDCA: Number,
    HDCFp: Number,
    HDGF: Number,
    HDGA: Number,
    HDGFp: Number,
    HDSHp: Number,
    'HDSV%': Number,
    SHp: Number,
    SVp: Number,
    PDO: Number,
    conference: String,
    division: String,
    abrev: String, 
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Players' }]
  });
  

const PlayerSchema = new Schema({
    "Player": String,
    "Team": String,
    "Position": String,
    "GP": Number,
    "TOI": Number,
    "Goals": Number,
    "Assists": Number,
    "FirstAssists": Number,
    "SecondAssists": Number,
    "Points": Number,
    "IPP": Number,
    "Shots": Number,
    "SH": Number,
    "ixG": Number,
    "iCF": Number,
    "iFF": Number,
    "iSCF": Number,
    "iHDCF": Number,
    "Rush": Number,
    "Rebounds": Number,
    "PIM": Number,
    "Penalties": Number,
    "Minor": Number,
    "Major": Number,
    "Misconduct": Number,
    "PenaltiesDrawn": Number,
    "Giveaways": Number,
    "Takeaways": Number,
    "Hits": Number,
    "HitsTaken": Number,
    "Blocked": Number,
    "FaceoffsWon": Number,
    "FaceoffsLost": Number,
    "Faceoffs": Number,
});

const rosterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    LW: { type: String, required: true },
    C: { type: String, required: true },
    RW: { type: String, required: true },
    LD: { type: String, required: true },
    RD: { type: String, required: true },
  }, { timestamps: true });

const Teams = mongoose.model('Teams', TeamSchema);
const Players = mongoose.model('Players', PlayerSchema);
const Rosters = mongoose.model('Roster', rosterSchema);

mongoose.connect(dbconf, mongooseOpts).then(() =>{
    console.log('connected to database ' + dbconf);
}).catch((err) => {
    console.error(err);
});

// TODO: create schema and register models
export{ Teams, Players, Rosters };