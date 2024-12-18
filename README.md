1. Thiết lập CORS để kết nối API BE với FE:

from fastapi.middleware.cors import CORSMiddleware

  app.add_middleware(
    CORSMiddleware,
   
    allow_origins=["http://localhost:3000"],
     
    allow_credentials=True,
   
    allow_methods=["*"],
   
    allow_headers=["*"],
)

Thêm package ở BE : pip install PyMuPDF

Clone Git

npm i

cd react-app

npm start
