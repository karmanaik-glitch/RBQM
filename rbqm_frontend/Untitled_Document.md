PS C:\Users\KARMA\Desktop\Project 02> # Terminal 1 — backend
>> cd rbqm_engine
>> pip install -r requirements.txt
>> python generate_data.py
>> python -m uvicorn api.main:app --reload
>> 
>> # Terminal 2 — frontend
>> cd rbqm_frontend
>> npm install
>> npm run dev
Requirement already satisfied: pandas in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 1)) (2.2.3)
Requirement already satisfied: numpy in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 2)) (2.2.6)
Requirement already satisfied: colorama in C:\Users\KARMA\AppData\Roaming\Python\Python313\site-packages (from -r requirements.txt (line 3)) (0.4.6)
Requirement already satisfied: scipy in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 4)) (1.17.1)
Requirement already satisfied: fastapi in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 5)) (0.136.1)
Requirement already satisfied: uvicorn in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 6)) (0.46.0)
Requirement already satisfied: python-multipart in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from -r requirements.txt (line 7)) (0.0.26)
Requirement already satisfied: python-dateutil>=2.8.2 in C:\Users\KARMA\AppData\Roaming\Python\Python313\site-packages (from pandas->-r requirements.txt (line 1)) (2.9.0.post0)
Requirement already satisfied: pytz>=2020.1 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from pandas->-r requirements.txt (line 1)) (2025.2)
Requirement already satisfied: tzdata>=2022.7 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from pandas->-r requirements.txt (line 1)) (2025.2)
Requirement already satisfied: starlette>=0.46.0 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from fastapi->-r requirements.txt (line 5)) (1.0.0)
Requirement already satisfied: pydantic>=2.9.0 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from fastapi->-r requirements.txt (line 5)) (2.13.3)
Requirement already satisfied: typing-extensions>=4.8.0 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from fastapi->-r requirements.txt (line 5)) (4.15.0)
Requirement already satisfied: typing-inspection>=0.4.2 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from fastapi->-r requirements.txt (line 5)) (0.4.2)
Requirement already satisfied: annotated-doc>=0.0.2 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from fastapi->-r requirements.txt (line 5)) (0.0.4)
Requirement already satisfied: click>=7.0 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from uvicorn->-r requirements.txt (line 6)) (8.3.3)
Requirement already satisfied: h11>=0.8 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from uvicorn->-r requirements.txt (line 6)) (0.16.0)
Requirement already satisfied: annotated-types>=0.6.0 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from pydantic>=2.9.0->fastapi->-r requirements.txt (line 5)) (0.7.0)
Requirement already satisfied: pydantic-core==2.46.3 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from pydantic>=2.9.0->fastapi->-r requirements.txt (line 5)) (2.46.3)
Requirement already satisfied: six>=1.5 in C:\Users\KARMA\AppData\Roaming\Python\Python313\site-packages (from python-dateutil>=2.8.2->pandas->-r requirements.txt (line 1)) (1.17.0)
Requirement already satisfied: anyio<5,>=3.6.2 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from starlette>=0.46.0->fastapi->-r requirements.txt (line 5)) (4.13.0)
Requirement already satisfied: idna>=2.8 in C:\Users\KARMA\AppData\Local\Programs\Python\Python313\Lib\site-packages (from anyio<5,>=3.6.2->starlette>=0.46.0->fastapi->-r requirements.txt (line 5)) (3.13)
Synthetic data generated successfully.

  sites.csv              5 rows
  patients.csv         203 rows
  visits.csv           729 rows
  queries.csv         1501 rows
  saes.csv               8 rows
  deviations.csv        44 rows
  ip_records.csv       260 rows
  measurements.csv     715 rows
INFO:     Will watch for changes in these directories: ['C:\\Users\\KARMA\\Desktop\\Project 02\\rbqm_engine']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [2552] using StatReload
INFO:     Started server process [8780]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
