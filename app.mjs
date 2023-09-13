import express from 'express'
import path from 'path'
import csv from 'csv-parser';
import fs from 'fs';
import { Teams, Players, Rosters } from './db.mjs';
import Jimp from 'jimp';
import url from 'url';
import hbs from 'hbs';
import equalHelper from 'handlebars-helper-equal';


const app = express();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));
hbs.registerHelper("equal", equalHelper);
  
// Parse and insert teams and players data
fs.createReadStream('teams.csv').pipe(csv()).on('data', async (data) =>{
    // Check if the data already exists in the database
    const existingTeam = await Teams.findOne({ Team: data.Team });
    if (existingTeam) {
        return;
    }
    const team = new Teams(data);
    team.save();
}).on('end', () =>{
    console.log('Teams data inserted successfully');
});

async function deleteAllPlayers(){
    try{
      await Players.deleteMany();
      console.log('All players deleted successfully.');
    } catch (error){
      console.error('Error deleting players:', error.message);
    }
}
//deleteAllPlayers();
async function deleteAllTeams(){
    try{
      await Teams.deleteMany();
      console.log('All Teams deleted successfully.');
    } catch (error){
      console.error('Error deleting teasm:', error.message);
    }
}
//deleteAllTeams();

async function percentileTeams(teamName, stat) {
    const allTeams = await Teams.find();
    const team = await Teams.findOne({ Team: teamName }).exec();
    const values = allTeams.map((t) => t[stat]);
    values.sort((a, b) => a - b);
  
    const index = values.indexOf(team[stat]);
    const percentile = (index / (values.length - 1)) * 100;
    return percentile;
}

async function percentilePlayers(name, stat) {
    const allPlayers = await Players.find();
    const player = await Players.findOne({ Player: name }).exec();
    const values = allPlayers.map((t) => t[stat]);
    values.sort((a, b) => a - b);

    const index = values.indexOf(player[stat]);
    const percentile = (index / (values.length - 1)) * 100;
    return percentile;
}
  

fs.createReadStream('players.csv').pipe(csv()).on('data',async (data) =>{
    const existingPlayer = await Players.findOne({ Player: data.Player });
    if (existingPlayer) {
        return;
    }
    const player = new Players(data);
    player.save();
}).on('end', () =>{
    console.log('Players data inserted successfully');
});

app.get('/', async (req, res) =>{
    const teams = await Teams.find().sort({ conference: 1, division: 1 }).exec();
    res.render('teams', { teams });
});
  
  // Route to display team details
app.get('/teams/:abrev', async (req, res) =>{
    const teamName = req.params.abrev;
    const team = await Teams.findOne({ abrev: teamName }).exec();
    if (team === null) {
        await res.status(404).send('Team not found');
        return;
    }    
    const players = await Players.find({ Team: teamName }).exec();
    team.players = players;
    const stats = ['CFp', 'SFp', 'GFp', 'xGFp', 'SCFp', 'HDCFp', 'HDGFp', 'SHp', 'SVp'];
    const data = await Promise.all(stats.map(stat => percentileTeams(team.Team, stat)));

    const labels = ['CF%', 'SF%', 'GF%', 'xGF%', 'SCF%', 'HDCF%', 'HDGF%', 'SH%', 'SV%'];
    const img = new Jimp(800, 400);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK);
    const fontBold = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK);
    const barColor = 0xFF0000; 
    const barWidth = 40;
    const barSpacing = 20;
    const chartHeight = img.bitmap.height - 80;
    const chartWidth = img.bitmap.width - 120;
    const maxDataPointValue = Math.max(...data);
    const yScale = chartHeight / maxDataPointValue;

    // Draw the Y-axis
    img.scan(60, 20, 1, chartHeight + 1, function(x, y, idx) {
      this.bitmap.data[idx + 0] = 0x00; 
      this.bitmap.data[idx + 1] = 0x00; 
      this.bitmap.data[idx + 2] = 0x00; 
      this.bitmap.data[idx + 3] = 0xFF; 
    });

    // Add y-axis labels
    const yAxisLabels = ['0%', '20%', '40%', '60%', '80%', '100%'];
    const labelSpacing = chartHeight / (yAxisLabels.length - 1);
    for (let i = 0; i < yAxisLabels.length; i++) {
      const labelY = chartHeight - i * labelSpacing;
      img.print(font, 30, labelY + 20, yAxisLabels[i]);
    }

    // Draw the X-axis labels
    for (let i = 0; i < labels.length; i++) {
      const x = i * (barWidth + barSpacing) + 80 + barWidth / 2;
      const y = chartHeight + 40;
      img.print(fontBold, x, y, labels[i], Jimp.HORIZONTAL_ALIGN_CENTER);
    }

    // Draw the bars https://www.tabnine.com/code/javascript/modules/jimp
    for (let i = 0; i < data.length; i++) {
      const barHeight = data[i] * yScale;
      const x = i * (barWidth + barSpacing) + 80;
      const y = chartHeight -barHeight + 20;
      img.scan(x, y, barWidth, barHeight, function(x, y, idx) {
        this.bitmap.data[idx + 0] = barColor >> 16 & 0xFF; 
        this.bitmap.data[idx + 1] = barColor >> 8 & 0xFF; 
        this.bitmap.data[idx + 2] = barColor & 0xFF; 
        this.bitmap.data[idx + 3] = 0xFF; 
      });
    }   
  
    //https://snyk.io/advisor/npm-package/jimp/example
    //https://stackoverflow.com/questions/20958078/resize-a-base-64-image-in-javascript-without-using-canvas
    const imageBuffer = await img.getBufferAsync(Jimp.MIME_PNG);
    const imageString = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    res.render('team', { team, imageString });
    //res.render('team', { team });
});

app.get('/players/:Player', async (req, res) =>{
    const player = await Players.findOne({ Player: req.params.Player }).exec();

    const SH = await percentilePlayers(player.Player, 'SH');
    const ixG = await percentilePlayers(player.Player, 'ixG');
    const iCF = await percentilePlayers(player.Player, 'iCF');
    const iSCF = await percentilePlayers(player.Player, 'iSCF');
    const iHDCF = await percentilePlayers(player.Player, 'iHDCF');
    const data = [SH, ixG, iCF, iSCF, iHDCF];
    const labels = ['SH%', 'ixG', 'iCF', 'iSCF', 'iHDCF'];
    const img = new Jimp(800, 400);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK);
    const fontBold = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK);
    const barColor = 0xFF0000; 
    const barWidth = 40;
    const barSpacing = 20;
    const chartHeight = img.bitmap.height - 80;
    const chartWidth = img.bitmap.width - 120;
    const maxDataPointValue = Math.max(...data);
    const yScale = chartHeight / maxDataPointValue;

    // Draw the Y-axis
    img.scan(60, 20, 1, chartHeight + 1, function(x, y, idx) {
      this.bitmap.data[idx + 0] = 0x00; 
      this.bitmap.data[idx + 1] = 0x00; 
      this.bitmap.data[idx + 2] = 0x00; 
      this.bitmap.data[idx + 3] = 0xFF; 
    });

    // Add y-axis labels
    const yAxisLabels = ['0%', '20%', '40%', '60%', '80%', '100%'];
    const labelSpacing = chartHeight / (yAxisLabels.length - 1);
    for (let i = 0; i < yAxisLabels.length; i++) {
      const labelY = chartHeight - i * labelSpacing;
      img.print(font, 30, labelY + 20, yAxisLabels[i]);
    }

    // Draw the X-axis labels
    for (let i = 0; i < labels.length; i++) {
      const x = i * (barWidth + barSpacing) + 80 + barWidth / 2;
      const y = chartHeight + 40;
      img.print(fontBold, x, y, labels[i], Jimp.HORIZONTAL_ALIGN_CENTER);
    }

    for (let i = 0; i < data.length; i++) {
      const barHeight = data[i] * yScale;
      const x = i * (barWidth + barSpacing) + 80;
      const y = chartHeight -barHeight + 20;
      img.scan(x, y, barWidth, barHeight, function(x, y, idx) {
        this.bitmap.data[idx + 0] = barColor >> 16 & 0xFF; 
        this.bitmap.data[idx + 1] = barColor >> 8 & 0xFF; 
        this.bitmap.data[idx + 2] = barColor & 0xFF; 
        this.bitmap.data[idx + 3] = 0xFF; 
      });
    }   
  
    const imageBuffer = await img.getBufferAsync(Jimp.MIME_PNG);
    const imageString = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    res.render('player', { player, imageString });
});

app.get('/roster', async (req, res) => {
    const players = await Players.find().exec();
    const rosters = await Rosters.find().exec();
    res.render('roster', { players, rosters });
});
app.post('/roster', async (req, res) =>{
    const { name, LW, C, RW, LD, RD, goalie } = req.body;
    const roster = new Rosters({
      name,
      LW,
      C,
      RW,
      LD,
      RD,
      goalie
    });
    try{
      await roster.save();
      res.redirect('/roster');
    } catch (err){
        console.error(err);
        res.send('Error creating roster');
    }
});
app.get('/roster/delete/:id', async (req, res) =>{
    try{
      const result = await Rosters.findByIdAndDelete(req.params.id).exec();
      if (!result){
        res.status(404).send('Roster not found');
      }
      else{
        res.redirect('/roster');
      }
    } catch (err){
      console.error(err);
      res.status(500).send('Server Error');
    }
});

app.get('/search', async (req, res) =>{
    const query = req.query.search; 
    const team = await Teams.findOne({ Team: query }).exec();
    const player = await Players.findOne({ Player: query }).exec();
    if (team){
        res.redirect(`/teams/${team.abrev}`);
    } 
    else if(player){
        res.redirect(`/players/${query}`);
    }
    else{
      res.send('No such Team or Player!');
    }
});

app.get('/random', async (req, res) =>{
  const query = req.query.rand; 
  if (query === "player"){
    const players = await Players.find().exec();
    const randomIndex = Math.floor(Math.random() * players.length);
    const randomPlayer = players[randomIndex];
    res.redirect(`/players/${randomPlayer.Player}`);
  }
  else{
    const teams = await Teams.find().exec();
    const randomIndex = Math.floor(Math.random() * teams.length);
    const randomTeam = teams[randomIndex];
    res.redirect(`/teams/${randomTeam.abrev}`);
  }
});

app.listen(process.env.PORT || 3000);
export default app;
