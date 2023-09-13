import request from 'supertest';
import mongoose from 'mongoose';
import { Teams, Players } from './db.mjs';
import app from './app.mjs';
import { expect } from 'chai';

describe('app', () =>{
    before(async () =>{
        await mongoose.createConnection('mongodb://localhost/finalproject-test',{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await Teams.create({
            Team: 'Team1',
            abrev: 'T1',
            conference: 'Eastern',
            division: 'Atlantic',
            CFp: 50,
            SFp: 40,
            GFp: 30,
            xGFp: 20,
            SCFp: 10,
            HDCFp: 5,
            HDGFp: 2,
            SHp: 15,
            SVp: 85,
        });

        await Players.create({
            Player: 'Player1',
            Team: 'T1',
            Position: 'Forward',
            GP: 10,
            G: 3,
            A: 4,
            P: 7,
            PM: 2,
        });
    });

    after(async () =>{
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    describe('GET /', () =>{
        it('responds with 200', async () =>{
            const response = await request(app).get('/');
            expect(response.status).to.equal(200);
        });
    });

    describe('GET /players/:name', () =>{
        it('render the player view for valid player name', async () =>{
            request(app)
                .get('/players/Player1')
                .expect('Content-Type', /html/)
                .end(function(err, res){
                    if (err) return done(err);
                    expect(res.text).to.include('<h1>Player1</h1>');
                });
        });
    });

    describe('GET teams/:abrev', () =>{
        it('responds with 404 to wrong team abreviation', async () =>{
            const response = await request(app).get('/teams/T2');
            expect(response.status).to.equal(404);
        });
        it('render the team view for valid team abbreviation', async () =>{
            request(app)
                .get('/teams/T1')
                .expect('Content-Type', /html/)
                .end(function(err, res){
                    if (err){
                        return done(err);
                    }
                    expect(res.text).to.include('<h1>Team1</h1>');
                });
        });
    });

    describe('GET /search?q=WRONG', () =>{   
        it('returns no team or player for invalid query', async () =>{
            const response = await request(app).get('/search?q=WRONG');
            expect(response.status).to.equal(200);
            expect(response.text).to.equal('No such Team or Player!');
        });
    });
});

//https://semaphoreci.com/community/tutorials/getting-started-with-node-js-and-mocha