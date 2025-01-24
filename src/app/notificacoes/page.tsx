// pages/dashboard/index.tsx
"use client";

import React from "react";
import Layout from "./layout";
import NotificationForm from "../Components/Notificacoes/Notificacoes";

const notificacoesPage = () => {
  return (
    <Layout>
      <div className="space-y-5 p-4">
        <NotificationForm />
      </div>
    </Layout>
  );
};

export default notificacoesPage;
