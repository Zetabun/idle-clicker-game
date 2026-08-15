#!/usr/bin/env python3
import importlib.util
import sqlite3
import unittest
from pathlib import Path
from collections import Counter
from datetime import date

spec=importlib.util.spec_from_file_location('builder', Path(__file__).with_name('build-networkrail-schedule.py'))
b=importlib.util.module_from_spec(spec); spec.loader.exec_module(b)

class BuilderTests(unittest.TestCase):
    def test_public_calls_exclude_pass_points_and_track_midnight(self):
        sched={'schedule_segment':{'schedule_location':[
            {'tiploc_code':'AAA','departure':'2355','public_departure':'2355','public_arrival':None,'platform':'1','pass':None,'arrival':None},
            {'tiploc_code':'PASS','pass':'0001','public_departure':None,'public_arrival':None,'platform':None,'departure':None,'arrival':None},
            {'tiploc_code':'BBB','arrival':'0010','departure':'0011','public_arrival':'0010','public_departure':'0011','platform':'2','pass':None},
            {'tiploc_code':'CCC','arrival':'0020','public_arrival':'0020','public_departure':None,'platform':'3','departure':None,'pass':None},
        ]}}
        calls,max_offset,unknown=b.public_calls_for_schedule(sched,{'AAA':'AAA','PASS':'PSS','BBB':'BBB','CCC':'CCC'})
        self.assertEqual([c[0] for c in calls],['AAA','BBB','CCC'])
        self.assertEqual([c[4] for c in calls],[0,1,1])
        self.assertEqual(max_offset,1)
        self.assertEqual(unknown,0)
        self.assertNotIn('PSS',[c[0] for c in calls])

    def test_public_call_requires_crs(self):
        sched={'schedule_segment':{'schedule_location':[
            {'tiploc_code':'AAA','departure':'1200','public_departure':'1200'},
            {'tiploc_code':'NOCRS','arrival':'1210','departure':'1211','public_arrival':'1210','public_departure':'1211'},
            {'tiploc_code':'BBB','arrival':'1220','public_arrival':'1220'},
        ]}}
        calls,_,unknown=b.public_calls_for_schedule(sched,{'AAA':'AAA','BBB':'BBB'})
        self.assertEqual([c[0] for c in calls],['AAA','BBB'])
        self.assertEqual(unknown,1)

    def _rows(self, stps):
        db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
        db.execute('create table x(id integer,start_date text,stp text)')
        for i,stp in enumerate(stps,1): db.execute('insert into x values(?,?,?)',(i,'2026-08-15',stp))
        return db.execute('select * from x order by id').fetchall()

    def test_overlay_beats_permanent(self):
        st=Counter(); got=b.select_schedule_group(self._rows(['P','O']),st)
        self.assertEqual([r['stp'] for r in got],['O'])
        self.assertEqual(st['overlays_applied'],1)

    def test_cancellation_beats_overlay_and_permanent(self):
        st=Counter(); got=b.select_schedule_group(self._rows(['P','O','C']),st)
        self.assertEqual([r['stp'] for r in got],['C'])
        self.assertEqual(st['planned_cancellations_applied'],1)

    def test_new_stp_is_standalone(self):
        st=Counter(); got=b.select_schedule_group(self._rows(['P','N']),st)
        self.assertEqual([r['stp'] for r in got],['P','N'])
        self.assertEqual(st['n_coexists_with_base_uid'],1)

    def test_half_minute_parses_without_breaking_clock(self):
        self.assertEqual(b.time_parts('2359H'),(1439,True))
        self.assertEqual(b.hhmm('0010H'),'00:10')

if __name__=='__main__': unittest.main(verbosity=2)
