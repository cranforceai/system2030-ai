SYSTEM 2030 AI – BLACKGOLD – RENDER EDITION vFinal.4
----------------------------------------------------
1. Wejdź na https://render.com
2. New -> Web Service -> Upload Folder
3. Wybierz folder z tym projektem
4. W "Environment" dodaj zmienną:
   DATABASE_URL = (link do bazy PostgreSQL z Render)
5. Deploy
6. Otwórz podany przez Render adres -> powinieneś zobaczyć System 2030 AI
7. Dane zapisują się w PostgreSQL + lecą backupy do /data/backups
8. Pierwszego dnia miesiąca robi się raport JSON + PDF w /data/monthly
