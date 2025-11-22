import { Counts, WallCounts } from './scoring';
import * as api from './api';
import type { Climber, Session } from './api';

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

function escapeCSVValue(value: any) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
}

export async function exportCSV(
  climbers?: Climber[],
  sessions?: Session[]
) {
  const [climberList, sessionList] = await Promise.all([
    climbers ? Promise.resolve(climbers) : api.getClimbers(),
    sessions ? Promise.resolve(sessions) : api.getSessions()
  ]);

  const climberNameMap = new Map<number, string>();
  climberList.forEach(climber => climberNameMap.set(climber.id, climber.name));

  const rows: string[] = [
    'type,id,name,climberId,date,notes,green,blue,yellow,orange,red,black,score'
  ];

  rows.push(
    ...climberList.map(climber =>
      [
        'climber',
        climber.id,
        escapeCSVValue(climber.name),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ].join(',')
    )
  );

  rows.push(
    ...sessionList.map(session =>
      [
        'session',
        session.id,
        escapeCSVValue(climberNameMap.get(session.climberId) || ''),
        session.climberId,
        session.date,
        escapeCSVValue(session.notes || ''),
        session.green ?? 0,
        session.blue ?? 0,
        session.yellow ?? 0,
        session.orange ?? 0,
        session.red ?? 0,
        session.black ?? 0,
        session.score ?? ''
      ].join(',')
    )
  );

  return rows.join('\n');
}

export function importFromJSON(jsonStr:string) {
  // Not supported with API backend
  return false;
}

export function clearAll(){
  // Not supported with API backend - would need backend endpoint
}
