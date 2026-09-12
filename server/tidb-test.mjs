/* Test connexion TiDB — formats user avec préfixe cluster. */
import mysql from 'mysql2/promise'

const password = '33804b17-4ba5-4b69-a0a8-ca7e6d0727d7'
/* Le user TiDB est <prefix>.root où prefix = les 8 premiers caracteres du cluster.
   03F8QNH0 pourrait ETRE le prefix. Formats a essayer : */
const users = ['03F8QNH0.root', 'root.03F8QNH0', '03F8QNH0']
const hosts = [
  'gateway01.us-east-1.prod.aws.tidbcloud.com',
  'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  'gateway01.us-west-2.prod.aws.tidbcloud.com',
  'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
]

for (const host of hosts) {
  for (const user of users) {
    process.stdout.write(`${host.split('.')[0]}.${host.split('.')[1]} ${user} ... `)
    try {
      const conn = await mysql.createConnection({
        host, port: 4000, user, password,
        connectTimeout: 6000,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      })
      const [rows] = await conn.query('SELECT 1 AS ok')
      console.log('CONNECTE !', JSON.stringify(rows))
      console.log('HOST OK :', host, '| USER OK :', user)
      await conn.end()
      process.exit(0)
    } catch (e) {
      console.log('non :', e.message.slice(0, 60))
    }
  }
}
console.log('Aucune combinaison na marche')
