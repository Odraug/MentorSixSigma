import React from "react";
import SalesOrdersList from "./SalesOrdersList";

export default function SalesOrdersPage() {

  return (

    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Sales Orders
      </h1>

      <SalesOrdersList />

    </div>

  );

}