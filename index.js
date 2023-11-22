const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const eks = require("@pulumi/eks");
const helm = require("@pulumi/kubernetes/helm");
const k8s = require("@pulumi/kubernetes");
const pulumi = require("@pulumi/pulumi");

// Create an EKS cluster with a configurable Node Group, and EBS drivers
let cluster = new eks.Cluster('cluster', {
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 4,
    storageClasses: "gp2",
    deployDashboard: false,
});

let ng = new eks.NodeGroup('ng', {
    cluster: cluster,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 4,
    instanceType: "t2.medium",
    labels: { "foo": "bar" },
}, {
    providers: { kubernetes: cluster.provider },
});

// Deploy Kong + Konga using the Helm Chart
let kong = new helm.v3.Chart("kong", {
    chart: "kong",
    version: "1.8.0",
    fetchOpts: {
        repo: "https://charts.konghq.com",
    },
    values: {
        proxy: {
            type: "NodePort"
        }
    }
}, { provider: cluster.provider });

let konga = new helm.v3.Chart("konga", {
    chart: "konga",
    version: "0.0.2",
    fetchOpts: {
        repo: "https://shubhamtatvamasi.github.io/helm-charts",
    }
}, { provider: cluster.provider });

// Creating RDS instances (MySQL, PostgreSQL)

// MySQL
const mysql = new aws.rds.Instance("mysql", {
    engine: "mysql",
    instanceClass: "db.t2.micro",
    publiclyAccessible: true,
    allocatedStorage: 20,
    storageType: "gp2",
    name: "mysql",
    username: "admin",
    password: "adminadmin",
    skipFinalSnapshot: true
});

// PostgreSQL
const postgresql = new aws.rds.Instance("postgresql", {
    engine: "postgres",
    instanceClass: "db.t2.micro",
    publiclyAccessible: true,
    allocatedStorage: 20,
    storageType: "gp2",
    name: "postgres",
    username: "admin",
    password: "adminadmin",
    skipFinalSnapshot: true
});

// Creating Redis and MongoDB instances goes here...

//CloudWatch Dashboard
let dashboard = new aws.cloudwatch.Dashboard("dashboard", {
    dashboardName: "my-dashboard",
    dashboardBody: JSON.stringify({
        widgets: [
            {
                type: "metric",
                x: 0,
                y: 0,
                width: 12,
                height: 6,
                properties: {
                    metrics: [[
                        "AWS/EC2",
                        "CPUUtilization",
                        "InstanceId",
                        "i-012345",
                    ]],
                    period: 300,
                    stat: "Average",
                    region: "us-east-1",
                    title: "EC2 Instance CPU",
                },
            },
            {
                type: "text",
                x: 0,
                y: 7,
                width: 3,
                height: 3,
                properties: {
                    markdown: "Hello world",
                },
            },
        ],
    }),
});

// Grafana
let grafana = new helm.v3.Chart("grafana", {
    chart: "grafana",
    version: "6.2.1",
    fetchOpts: {
        repo: "https://charts.grafana.com/stable",
    }
}, { provider: cluster.provider });

//Export the kubeconfig
exports.kubeconfig = cluster.kubeconfig;
