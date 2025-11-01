import { Counts, WallCounts } from './scoring';
import * as api from './api';

type Climber = { id:number; name:string };
type Session = { id:number; climberId:number; date:string; notes?:string; score:number; wallCounts?: WallCounts } & Counts;

export async function addClimber(name:string) {
  return await api.addClimber(name);
}

export async function listClimbers() {
  return await api.getClimbers();
}

export async function addSession(session: {climberId:number; date:string; notes?:string; score:number}, counts: Counts, wallCounts?: WallCounts) {
  return await api.addSession({
    climberId: session.climberId,
    date: session.date,
    notes: session.notes,
    wallCounts
  });
}

export async function getSessions() {
  return await api.getSessions();
}

export async function leaderboard(from?:string, to?:string) {
  return await api.getLeaderboard();
}

export function exportCSV() {
  // This will need to fetch all data from API
  // For now, return empty CSV structure
  return 'type,id,name,climberId,date,notes,green,blue,yellow,orange,red,black,score\n';
}

export function importFromJSON(jsonStr:string) {
  // Not supported with API backend
  return false;
}

export function clearAll(){
  // Not supported with API backend - would need backend endpoint
}
