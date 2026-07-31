#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]; SRC=ROOT/'strikewatch-source'
OLD='12.209'; NEW='12.210'; OLD_NAME='Mobile Header Button Fix'; NEW_NAME='League and Equipment Navigation'; OLD_ID='12.209.0-mobile-header-button-fix'; NEW_ID='12.210.0-league-equipment-navigation'
def r(p): return p.read_text(encoding='utf-8')
def w(p,t): p.write_text(t,encoding='utf-8')
def one(t,a,b,l):
    if t.count(a)!=1: raise SystemExit(f'{l}: found {t.count(a)}')
    return t.replace(a,b,1)
rel=SRC/'RELEASE.json'
if json.loads(r(rel))!={'version':OLD,'name':OLD_NAME,'build_id':OLD_ID}: raise SystemExit('unexpected predecessor')
w(rel,json.dumps({'version':NEW,'name':NEW_NAME,'build_id':NEW_ID},indent=2)+'\n')
core=SRC/'js/00-core.js'; t=r(core); t=one(t,f"  const BUILD_VERSION = '{OLD}';",f"  const BUILD_VERSION = '{NEW}';",'version'); t=one(t,f"  const BUILD_NAME = '{OLD_NAME}';",f"  const BUILD_NAME = '{NEW_NAME}';",'name'); t=one(t,f"  const BUILD_ID = '{OLD_ID}';",f"  const BUILD_ID = '{NEW_ID}';",'id'); w(core,t)
menus=SRC/'js/50-ui-menus.js'; t=r(menus)
start=t.index('  const menuSections = {'); end=t.index('\n  const menuTabMeta = {',start)
sections="""  const menuSections = {
    operations: {
      label: 'OPERATIONS',
      commandKicker: 'STRIKEWATCH // MATCH OPERATIONS',
      commandTitle: 'OPERATIONS DECK',
      description: 'Today, messages, telemetry and match review.',
      defaultRoute: 'play',
      routes: [
        { id: 'play', label: 'OVERVIEW', hint: 'Club overview and next actions', overview: true },
        { id: 'calendar', label: 'CALENDAR', hint: 'Matches, deadlines and club events' },
        { id: 'mail', label: 'INBOX', hint: 'Club messages and matchday mail' },
        { id: 'telemetry', label: 'TEAM TELEMETRY', hint: 'Overall squad data' },
        { id: 'reports', label: 'AFTER ACTION', hint: 'Team and player debrief' }
      ]
    },
    career: {
      label: 'TEAM',
      commandKicker: 'STRIKEWATCH // TEAM DEPARTMENT',
      commandTitle: 'TEAM DEPARTMENT',
      description: 'Squad building, tactics, recruitment and contract activity.',
      defaultRoute: 'team-hub',
      routes: [
        { id: 'team-hub', label: 'OVERVIEW', hint: 'Team status and direct shortcuts', overview: true },
        { id: 'operators', label: 'SQUAD', hint: 'Line-up and contracts' },
        { id: 'tactics', label: 'TACTICS', hint: 'Formation and delegation' },
        { id: 'market', label: 'RECRUITMENT', hint: 'Scout available players' },
        { id: 'transfers', label: 'TRANSFERS', hint: 'Offers and negotiations' },
        { id: 'honours', label: 'HONOURS', hint: 'Awards, milestones and club records' },
        { id: 'profile', label: 'PLAYER PROFILE', hint: 'History and full data', contextOnly: true }
      ]
    },
    league: {
      label: 'LEAGUE',
      commandKicker: 'STRIKEWATCH // DIVISION COMPETITION',
      commandTitle: 'LEAGUE CENTRE',
      description: 'Standings, fixtures, rivals, objectives and promotion progress.',
      defaultRoute: 'league',
      routes: [
        { id: 'league', label: 'LEAGUE CENTRE', hint: 'Table, fixtures, results, pulse and objectives', overview: true }
      ]
    },
    armoury: {
      label: 'EQUIPMENT',
      commandKicker: 'STRIKEWATCH // EQUIPMENT & SUPPLY',
      commandTitle: 'EQUIPMENT CONTROL',
      description: 'Inventory, operator loadouts, purchasing and field crates.',
      defaultRoute: 'armoury-hub',
      routes: [
        { id: 'armoury-hub', label: 'OVERVIEW', hint: 'Inventory and issue status', overview: true },
        { id: 'loadout', label: 'TEAM ARMOURY', hint: 'Weapons, armour and individual player loadouts' },
        { id: 'supplies-hub', label: 'SUPPLY OVERVIEW', hint: 'Balances, stock and purchasing shortcuts' },
        { id: 'store', label: 'SUPPLY DEPOT', hint: 'Field crates, weapons, armour and future ammunition' }
      ]
    },
    systems: {
      label: 'CLUB',
      commandKicker: 'STRIKEWATCH // CLUB ADMINISTRATION',
      commandTitle: 'CLUB OFFICE',
      description: 'Development, staff, accounts, partners and configuration.',
      defaultRoute: 'club-hub',
      routes: [
        { id: 'club-hub', label: 'OVERVIEW', hint: 'Club systems and current priorities', overview: true },
        { id: 'training', label: 'TRAINING', hint: 'Player and team development' },
        { id: 'infrastructure', label: 'INFRASTRUCTURE', hint: 'Permanent club facilities and specialisation' },
        { id: 'staff', label: 'STAFF', hint: 'Assistant manager recruitment' },
        { id: 'barracks', label: 'FINANCES', hint: 'Cashflow, analytics and ledger' },
        { id: 'gold', label: 'GOLD COINS', hint: 'Earnings, spending and account history' },
        { id: 'commercial', label: 'COMMERCIAL', hint: 'Sponsors and partner income' },
        { id: 'supporters', label: 'FANS', hint: 'Supporter expectations, popularity and reactions' },
        { id: 'settings', label: 'CONFIGURATION', hint: 'Display and audio' }
      ]
    }
  };
"""
t=t[:start]+sections+t[end:]
t=t.replace("{ operations: 'OPS', career: 'TEAM', armoury: 'GEAR', supplies: 'SUPPLY', systems: 'CLUB' }","{ operations: 'OPS', career: 'TEAM', league: 'LEAGUE', armoury: 'EQUIP', systems: 'CLUB' }")
w(menus,t)
idx=SRC/'index.html'; t=r(idx)
t=t.replace(f'Strikewatch {OLD}: {OLD_NAME}',f'Strikewatch {NEW}: {NEW_NAME}').replace(OLD_ID,NEW_ID)
t=one(t,f'id="managerBuildVersion">{OLD}</b>',f'id="managerBuildVersion">{NEW}</b>','desktop version'); t=one(t,f'id="mobileCommandBuildVersion">{OLD}</b>',f'id="mobileCommandBuildVersion">{NEW}</b>','mobile version')
nav_start=t.index('        <div class="menu-nav" id="menuNav">'); nav_end=t.index('        <div class="menu-side-actions">',nav_start)
nav="""        <div class="menu-nav" id="menuNav">
          <button class="menu-tab active" data-section="operations"><span class="menu-tab-index">01</span><span class="menu-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg></span><span class="menu-tab-copy"><strong><span class="menu-tab-label-full">OPERATIONS</span><span class="menu-tab-label-mobile" aria-hidden="true">OPS</span></strong><small>Today, inbox, calendar and match review</small></span><span class="menu-tab-chevron" aria-hidden="true">›</span></button>
          <button class="menu-tab" data-section="career"><span class="menu-tab-index">02</span><span class="menu-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20"></path><circle cx="17" cy="9" r="2.4"></circle><path d="M15.4 14.2h1.9a3.7 3.7 0 0 1 3.7 3.7V20"></path></svg></span><span class="menu-tab-copy"><strong>TEAM</strong><small>Squad, tactics, recruitment and transfers</small></span><span class="menu-tab-chevron" aria-hidden="true">›</span></button>
          <button class="menu-tab" data-section="league"><span class="menu-tab-index">03</span><span class="menu-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h12v5c0 4-2.7 7-6 7s-6-3-6-7V3Z"></path><path d="M9 21h6M12 15v6M6 6H3v2c0 2.2 1.8 4 4 4M18 6h3v2c0 2.2-1.8 4-4 4"></path></svg></span><span class="menu-tab-copy"><strong>LEAGUE</strong><small>Table, fixtures, rivals and objectives</small></span><span class="menu-tab-chevron" aria-hidden="true">›</span></button>
          <button class="menu-tab" data-section="armoury"><span class="menu-tab-index">04</span><span class="menu-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5.2c0 4.9-3.1 8.1-8 9.8-4.9-1.7-8-4.9-8-9.8V6l8-3Z"></path><path d="m4 7 8-4 8 4"></path></svg></span><span class="menu-tab-copy"><strong><span class="menu-tab-label-full">EQUIPMENT</span><span class="menu-tab-label-mobile" aria-hidden="true">EQUIP</span></strong><small>Armoury, inventory, crates and purchasing</small></span><span class="menu-tab-chevron" aria-hidden="true">›</span></button>
          <button class="menu-tab" data-section="systems"><span class="menu-tab-index">05</span><span class="menu-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 21V8l8-4 8 4v13"></path><path d="M8 21v-5h8v5M8 10h2M14 10h2M8 13h2M14 13h2"></path></svg></span><span class="menu-tab-copy"><strong>CLUB</strong><small>Training, staff, finances and commercial</small></span><span class="menu-tab-chevron" aria-hidden="true">›</span></button>
        </div>
"""
t=t[:nav_start]+nav+t[nav_end:]
w(idx,t)
note=f"Build {NEW} promotes League to the five-item primary navigation and consolidates Armoury plus Supplies under Equipment. Operations now focuses on daily work, while existing route and data authorities remain unchanged. See `AUDIT-{NEW}.md`.\n\n"
for p in [SRC/'HANDOFF.md',SRC/'AGENTS.md']:
    t=r(p); t=one(t,f'Build {OLD} wires',note+f'Build {OLD} wires',p.name)
    if p.name=='HANDOFF.md':
        t=one(t,f'- Build: **{OLD} — {OLD_NAME}**',f'- Build: **{NEW} — {NEW_NAME}**','handoff build'); t=one(t,f'- Build ID: `{OLD_ID}`',f'- Build ID: `{NEW_ID}`','handoff id'); t=one(t,f'strikewatch-build-{OLD}.html',f'strikewatch-build-{NEW}.html','standalone')
    w(p,t)
readme=SRC/'README.md'; t=r(readme); t=one(t,f'# Strikewatch Source {OLD}',f'# Strikewatch Source {NEW}','readme'); t=one(t,f'dist/strikewatch-build-{OLD}.html',f'dist/strikewatch-build-{NEW}.html','readme dist'); w(readme,t)
proj=SRC/'PROJECT.md'; t=r(proj); oldline=f'Build {OLD} makes the contextual mobile header buttons use the authoritative menu route handler so they open their intended pages. See `HANDOFF.md` and `AUDIT-{OLD}.md`.'; newline=f'Build {NEW} gives League a primary navigation slot and unifies Armoury and Supplies under Equipment without changing route or gameplay authority. See `HANDOFF.md` and `AUDIT-{NEW}.md`.'; t=one(t,oldline,newline,'project'); w(proj,t)
w(SRC/f'AUDIT-{NEW}.md',f'''# Build {NEW} audit — {NEW_NAME}\n\n## Change\n- Primary navigation is now Ops, Team, League, Equipment and Club.\n- League moves out of Operations into its own primary section.\n- Armoury and Supplies are consolidated under Equipment.\n- Equipment exposes Overview, Team Armoury, Supply Overview and Supply Depot through the contextual submenu.\n- Operations keeps Overview, Calendar, Inbox, Team Telemetry and After Action.\n- Existing pages, state, purchase logic, inventory, fixtures and saves are unchanged.\n\n## Verification\nThe release requires deterministic double builds, modular/generated/standalone JavaScript parsing, primary-section and route assertions, and root/standalone byte identity. Save schema 19 and diagnostics schema 1 remain unchanged.\n''')
print('Applied 12.210')
