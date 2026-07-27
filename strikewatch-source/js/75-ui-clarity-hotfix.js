/*
 * Strikewatch source module: 75-ui-clarity-hotfix.js
 * Purpose: Scoped presentation fixes for tactical summary tags, role-assignment
 * alignment and disabled End Day contrast in the 12.130 release.
 */

  (() => {
    const style = document.createElement('style');
    style.id = 'strikewatch-12-130-ui-clarity';
    style.textContent = `
      .club-tactics-hero .menu-pill-row {
        gap: 10px;
        align-items: stretch;
      }

      .club-tactics-hero .menu-pill {
        display: inline-flex;
        align-items: center;
        min-height: 42px;
        padding: 10px 16px;
        border: 1px solid rgba(108, 216, 255, .56);
        border-radius: 7px;
        background:
          linear-gradient(135deg, rgba(19, 109, 150, .96), rgba(22, 72, 116, .96));
        color: #f8fcff;
        box-shadow: 0 7px 18px rgba(2, 20, 36, .30), inset 0 1px rgba(255,255,255,.09);
        text-shadow: 0 1px 2px rgba(0,0,0,.55);
      }

      .club-tactics-hero .menu-pill::first-letter {
        color: #9cecff;
      }

      .club-role-assignment-list > article {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) minmax(220px, .72fr) minmax(300px, .9fr);
        align-items: center;
        gap: 18px;
        min-height: 112px;
        padding: 18px 20px;
      }

      .club-role-assignment-list > article > span {
        align-self: center;
      }

      .club-role-assignment-list > article > div:first-of-type {
        min-width: 0;
      }

      .club-role-fit-readout {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        gap: 4px;
        min-width: 0;
        text-align: right;
      }

      .club-role-assignment-list > article > label {
        display: grid;
        grid-template-columns: 1fr;
        align-content: center;
        gap: 7px;
        min-width: 0;
        margin: 0;
      }

      .club-role-assignment-list > article > label > span {
        margin: 0;
      }

      .club-role-assignment-list > article > label select {
        width: 100%;
        min-height: 54px;
      }

      .manager-end-day-primary,
      .manager-end-day-primary:disabled,
      .manager-end-day-primary[aria-disabled='true'] {
        color: #f5fff8;
        text-shadow: 0 1px 2px rgba(0,0,0,.72);
      }

      .manager-end-day-primary:disabled,
      .manager-end-day-primary[aria-disabled='true'] {
        opacity: 1;
        background: linear-gradient(180deg, rgba(47, 72, 64, .98), rgba(27, 46, 41, .98));
        border-color: rgba(145, 205, 174, .58);
        box-shadow: inset 0 1px rgba(255,255,255,.08), 0 0 0 1px rgba(0,0,0,.24);
      }

      .manager-end-day-primary:disabled span,
      .manager-end-day-primary:disabled strong,
      .manager-end-day-primary:disabled small,
      .manager-end-day-primary[aria-disabled='true'] span,
      .manager-end-day-primary[aria-disabled='true'] strong,
      .manager-end-day-primary[aria-disabled='true'] small {
        color: #eaf8ef;
        opacity: 1;
      }

      .manager-end-day-primary:disabled small,
      .manager-end-day-primary[aria-disabled='true'] small {
        color: #c6dfcf;
      }

      @media (max-width: 1023px) {
        .club-tactics-hero .menu-pill-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .club-tactics-hero .menu-pill {
          width: 100%;
          min-height: 44px;
          padding: 9px 11px;
          white-space: normal;
          line-height: 1.15;
        }

        .club-role-assignment-list > article {
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 10px 12px;
          min-height: 0;
          padding: 16px 14px;
        }

        .club-role-assignment-list > article > span {
          grid-row: 1 / span 3;
          align-self: start;
          padding-top: 3px;
        }

        .club-role-assignment-list > article > div:first-of-type,
        .club-role-fit-readout,
        .club-role-assignment-list > article > label {
          grid-column: 2;
          width: 100%;
        }

        .club-role-fit-readout {
          align-items: flex-start;
          text-align: left;
          padding-top: 3px;
        }

        .club-role-assignment-list > article > label {
          padding-top: 4px;
        }

        .club-role-assignment-list > article > label select {
          min-height: 48px;
        }
      }

      @media (max-width: 430px) {
        .club-tactics-hero .menu-pill-row {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  })();
