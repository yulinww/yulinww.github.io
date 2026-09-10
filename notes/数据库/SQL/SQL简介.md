# SQL简介

## SQL是什么

SQL（Structured Query Language，结构化查询语言）用于管理关系数据库管理系统（RDBMS）。

> 关系数据库管理系统（Relational Database Management System，RDBMS）是指包括相互联系的逻辑组织和存取这些数据的一套程序。关系数据库管理系统就是管理关系数据库，并将数据逻辑组织的系统。
>
> RDBMS是SQL的基础，同样也是现代所有数据库系统的基础，比如MS SQL Server、IBM DB2、Oracle、MySQL以及Microsoft Access。
>
> RDBMS中的数据存储在被称为表的数据库对象中。表是相关的数据项的集合，它由列和行组成。

SQL通过一系列的语句和命令来执行数据定义、数据查询、数据操作和数据控制等功能，包括数据插入、查询、更新和删除，数据库模式创建和修改，以及数据访问控制。

SQL由国际标准化组织（ISO）和美国国家标准学会（ANSI）标准化。

> 国际标准化组织（International Organization for Standardization，ISO）是标准化领域中的一个国际组织。其主要活动是指定国际标准，协调世界范围的标准化工作。
>
> 美国国家标准学会（American National Standards Institute，ANSI）是非营利性民间标准化组织，总部设于纽约。主要职能为协调国内标准化活动、审批美国国家标准、代表美国参与国际标准化组织。

虽然SQL是一门ANSI标准的计算机语言，但是仍然存在着多种不同版本的SQL语言。

然而，为了与ANSI标准相兼容，它们必须以相似的方式共同地来支持一些主要的命令（比如SELECT、UPDATE、DELETE、INSERT、WHERE等）。

> 注：除了SQL标准之外，大部分SQL数据库程序都拥有它们自己的专有扩展。



## 在网站中使用SQL

要创建一个显示数据库中数据的网站，需要：

- RDBMS数据库程序（如SQL Server、MySQL）
- 服务器端脚本语言
- 使用SQL来获取你想要的数据
- 使用HTML / CSS



## SQL能做什么

- 面向数据库执行查询
- 从数据库取回数据
- 在数据库中插入新的记录
- 更新数据库中的数据
- 从数据库删除记录
- 创建新数据库
- 在数据库中创建新表
- 在数据库中创建存储过程
- 在数据库中创建视图
- 设置表、存储过程和视图的权限