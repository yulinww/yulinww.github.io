# SQL基础语法

## 数据库表

一个数据库通常包含一个或多个表，每个表有一个名字（例如：“Students”），表包含带有数据的记录（行）。

此处，我们在MySQL的`sql_learning_lab`数据库中创建了`students`表，用于存储学生信息。

我们可以通过以下命令查看`students`表的数据。

```sql
mysql> USE sql_learning_lab;
Database changed

mysql> SELECT * FROM students;
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  2 | 李娜 | 女     | 软件工程   | 92.00 |
|  3 | 王强 | 男     | 计算机技术 | 76.50 |
|  4 | 赵敏 | 女     | 人工智能   | 95.50 |
|  5 | 陈晨 | 女     | 软件工程   | 84.00 |
|  6 | 刘洋 | 男     | 人工智能   |  NULL |
|  7 | 孙悦 | 女     | 计算机技术 | 88.50 |
|  8 | 周杰 | 男     | 网络安全   | 69.00 |
+----+------+--------+------------+-------+
8 rows in set (0.00 sec)
```

表由行和列组成，每一行表示一条完整的记录，例如一名学生；每一列表示记录的一项属性，例如姓名、专业或成绩；行列交叉处是具体的字段值。

上表包含8条记录和5个列。下面的语法示例默认使用这张`students`表。



## SQL语句注意事项

### 大小写

SQL**关键字**对**大小写不敏感**，`SELECT`和`select`是相同的，但大小写可以帮助区分不同类型的内容。

通常采用这种约定：

- SQL关键字使用大写：`SELECT`、`FROM`、`WHERE`
- 数据库、表和列名使用小写：`students`、`name`、`score`

### 分号

**分号**是在数据库系统中分隔每条SQL语句的标准方法，要求在每条SQL语句的末端使用分号。

### 引号

引号的使用：

- 单引号`‘ ’`：用于表示字符串值。
- 双引号`“ ”`：用于引用数据库对象名称，如表名、字段名。在MySQL默认模式下，它通常也可以表示字符串，但不建议依赖这种行为。——MySQL启用`ANSI_QUOTES`模式后，双引号将用于引用数据库对象，不能再表示字符串。因此，建议**始终使用单引号表示字符串**，**必要时使用反引号引用对象名称**。
- 反引号`` ` ` ``：引用表名、字段名等对象名称。

```sql
-- 字符串值使用单引号
SELECT * FROM students WHERE name = '张伟';
-- 字符串中包含单引号时，可以写成两个连续的单引号
SELECT 'Tom''s book';
-- 当对象名称与关键字冲突或包含空格、特殊字符时，才特别需要反引号
SELECT `order` FROM `student scores`;
```

### 注释

`-- `表示单行注释，`/* */`表示多行注释。

在MySQL中，`--`也可以替换成`#`。

```sql
-- 查询成绩不低于80分的学生
SELECT *
FROM students
WHERE score >= 80;

# 查询成绩不低于80分的学生
SELECT *
FROM students
WHERE score >= 80;

/*
查询计算机技术专业中
成绩不低于80分的学生
*/
SELECT *
FROM students
WHERE major = '计算机技术'
  AND score >= 80;
  
SELECT name, score
FROM students
WHERE score >= 80  -- 只保留较高成绩
ORDER BY score DESC;

SELECT name, score
FROM students
WHERE score >= 80  # 只保留较高成绩
ORDER BY score DESC;

SELECT name, score
FROM students
WHERE score >= 80  /* 只保留较高成绩 */
ORDER BY score DESC;
```



### 换行与空格

SQL通常对空格和换行不敏感，它们主要用于分隔关键字、表名、字段名等语法元素，改善代码可读性。

例如，下面这两条语句是等价的：

```sql
SELECT name, score FROM students WHERE score >= 80;

SELECT name, score
FROM students
WHERE score >= 80;
```

使用换行与空格来改善可读性：

```sql
-- 多个连续空格通常等于一个空格
SELECT    name
FROM      students;

-- 换行通常可以代替空格
SELECT
    name,
    major,
    score
FROM
    students
WHERE
    score >= 80;
```



## SQL SELECT语句

`SELECT`语句用于从数据库中选取数据。

查询得到的数据以结果集的形式返回。结果集看起来像一张表，但它通常只是本次查询产生的临时结果，并不表示数据库中又创建了一张新表。

### 语法

```sql
SELECT column1, column2, ...
FROM table_name;

SELECT * FROM table_name;
```

### 说明

- `column1, column2, ...`：需要返回的字段或表达式，多个项目之间使用逗号分隔；使用`*`表示返回所有字段。——实际开发中通常建议明确写出需要的字段，而不是直接使用`*`，这样可以减少不必要的数据读取，并让查询结果更加明确。（下文不再重复）
- `table_name`：要查询的表名称。（下文不再重复）

### 示例

```sql
mysql> SELECT name, gender FROM students;
+------+--------+
| name | gender |
+------+--------+
| 张伟 | 男     |
| 李娜 | 女     |
| 王强 | 男     |
| 赵敏 | 女     |
| 陈晨 | 女     |
| 刘洋 | 男     |
| 孙悦 | 女     |
| 周杰 | 男     |
+------+--------+
8 rows in set (0.00 sec)

mysql> SELECT * FROM students;
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  2 | 李娜 | 女     | 软件工程   | 92.00 |
|  3 | 王强 | 男     | 计算机技术 | 76.50 |
|  4 | 赵敏 | 女     | 人工智能   | 95.50 |
|  5 | 陈晨 | 女     | 软件工程   | 84.00 |
|  6 | 刘洋 | 男     | 人工智能   |  NULL |
|  7 | 孙悦 | 女     | 计算机技术 | 88.50 |
|  8 | 周杰 | 男     | 网络安全   | 69.00 |
+----+------+--------+------------+-------+
8 rows in set (0.00 sec)
```



## SQL SELECT DISTINCT语句

`SELECT DISTINCT`用于去除查询结果中的重复记录，只返回互不相同的值。

当`DISTINCT`后面有多个字段时，它判断的是这些字段组成的完整组合是否重复，而不是分别对每个字段去重。

### 语法

```sql
SELECT DISTINCT column1, column2, ...
FROM table_name;
```

### 说明

略。

### 示例

下面的SQL语句仅从`students`表的`major`列中选取唯一不同的值，也就是去掉`major`列的重复值。

```sql
mysql> SELECT DISTINCT major FROM students;
+------------+
| major      |
+------------+
| 计算机技术 |
| 软件工程   |
| 人工智能   |
| 网络安全   |
+------------+
4 rows in set (0.00 sec)
```

下面的SQL语句按照`students`表的`gender`和`major`列的组合选取唯一不同的值。

```sql
mysql> SELECT DISTINCT gender, major FROM students;
+--------+------------+
| gender | major      |
+--------+------------+
| 男     | 计算机技术 |
| 女     | 软件工程   |
| 女     | 人工智能   |
| 男     | 人工智能   |
| 女     | 计算机技术 |
| 男     | 网络安全   |
+--------+------------+
6 rows in set (0.00 sec)
```



## SQL WHERE子句

`WHERE`子句用于提取那些满足指定条件的记录。

### 语法

```sql
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

### 说明

- `condition`：筛选条件，可以使用比较运算符、逻辑运算符等，也可以组合多个条件。
- 对于“筛选条件”的说明：（下文不再重复）
  - 字符串和日期通常使用单引号包裹，如`gender='男'`
  - 数字一般不需要使用引号，如`score>=80`
  - 判断是否为NULL时，应使用`IS NULL`或`IS NOT NULL`

### 示例

下面的SQL语句从`students`表中选取性别为`男`的所有学生。

```sql
mysql> SELECT * FROM students WHERE gender = '男';
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  3 | 王强 | 男     | 计算机技术 | 76.50 |
|  6 | 刘洋 | 男     | 人工智能   |  NULL |
|  8 | 周杰 | 男     | 网络安全   | 69.00 |
+----+------+--------+------------+-------+
4 rows in set (0.00 sec)
```



## SQL AND和OR运算符

### 说明

- `AND`：连接多个条件，只有所有条件都成立时，才返回该记录。
- `OR`：连接多个条件，只要至少有一个条件成立，就返回该记录。

### 示例

下面的SQL语句从`students`表中选取`major`为`计算机技术`且`score`大于等于`80`的所有学生。

```sql
mysql> SELECT * FROM students
    -> WHERE major = '计算机技术'
    -> AND score >= 80;
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  7 | 孙悦 | 女     | 计算机技术 | 88.50 |
+----+------+--------+------------+-------+
2 rows in set (0.00 sec)
```

下面的SQL语句从`students`表中选取`major`为`人工智能`或者`网络安全`的所有学生。

```sql
mysql> SELECT * FROM students
    -> WHERE major = '人工智能'
    -> OR major = '网络安全';
+----+------+--------+----------+-------+
| id | name | gender | major    | score |
+----+------+--------+----------+-------+
|  4 | 赵敏 | 女     | 人工智能 | 95.50 |
|  6 | 刘洋 | 男     | 人工智能 |  NULL |
|  8 | 周杰 | 男     | 网络安全 | 69.00 |
+----+------+--------+----------+-------+
3 rows in set (0.00 sec)
```

也可以把AND和OR结合起来，使用圆括号来组成更复杂的表达式。

在没有圆括号的情况下，`AND`的优先级高于`OR`。同时使用二者时，建议使用圆括号明确条件的组合关系，避免产生歧义。

下面的SQL语句从`students`表中选取`score`大于等于`80`且`major`为`计算机技术`或`软件工程`的所有学生。

```sql
mysql> SELECT * FROM students
    -> WHERE score >= 80
    -> AND (major = '计算机技术' OR major = '软件工程');
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  2 | 李娜 | 女     | 软件工程   | 92.00 |
|  5 | 陈晨 | 女     | 软件工程   | 84.00 |
|  7 | 孙悦 | 女     | 计算机技术 | 88.50 |
+----+------+--------+------------+-------+
4 rows in set (0.00 sec)
```



## SQL ORDER BY关键字

`ORDER BY`用于按照一个或者多个字段对查询结果进行排序。

`ORDER BY`默认采用升序（ASC）排列；如需按降序排列，可以在字段名后使用`DESC`。

> Ascending（ASC），升序；
>
> Descending（DESC），降序。

### 语法

```sql
SELECT column1, column2, ...
FROM table_name
ORDER BY
	column1 [ASC | DESC],
	column2 [ASC | DESC],
    ...;
```

- `ORDER BY`用于对查询结果进行排序，不会改变数据在表中的实际存储顺序。
- 多字段排序时，先按照第一个字段排序；第一个字段值相同时，再按照第二个字段排序，以此类推。
- `ASC`表示升序，例如数字从小到大、日期从早到晚。
- `DESC`表示降序，例如数字从大到小、日期从晚到早。
- 每个排序字段都可以单独指定`ASC`或`DESC`。
- `[ASC | DESC]`表示二者任选其一，也可以省略；省略时默认为`ASC`。

### 示例

下面的SQL语句从`students`表中选取所有学生，并按照专业升序排列；专业相同时，再按照成绩降序排列。

```sql
mysql> SELECT * FROM students
    -> ORDER BY
    ->     major ASC,
    ->     score DESC;
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  4 | 赵敏 | 女     | 人工智能   | 95.50 |
|  6 | 刘洋 | 男     | 人工智能   |  NULL |
|  8 | 周杰 | 男     | 网络安全   | 69.00 |
|  1 | 张伟 | 男     | 计算机技术 | 88.50 |
|  7 | 孙悦 | 女     | 计算机技术 | 88.50 |
|  3 | 王强 | 男     | 计算机技术 | 76.50 |
|  2 | 李娜 | 女     | 软件工程   | 92.00 |
|  5 | 陈晨 | 女     | 软件工程   | 84.00 |
+----+------+--------+------------+-------+
8 rows in set (0.02 sec)
```

> 注意：如果多条记录在所有排序字段上的值都相同，数据库可能暂时以固定顺序返回它们，但SQL并不保证这个顺序稳定不变。需要获得稳定且唯一的排序结果时，可以把主键等唯一字段作为最后一个排序条件。



## SQL INSERT INTO关键字

`INSERT INTO`语句可以有两种编写形式。

### 语法

第一种形式无需指定要插入数据的列名，只需提供被插入的值即可：

```sql
INSERT INTO table_name
VALUES (value1, value2, value3, ...);
```

第二种形式需要指定列名及被插入的值：

```sql
INSERT INTO table_name (column1, column2, column3, ...)
VALUES (value1, value2, value3, ...);
```

### 说明

- `column1, column2, column3, ...`：要写入数据的字段名称，字段之间使用英文逗号分隔。
- `value1, value2, value3, ...`：要插入的字段值，其数量和排列顺序必须与前面指定的字段一一对应。
- 字符串通常使用单引号包裹，数值通常不需要引号；没有确定的值时，可以根据字段约束使用`NULL`。
- 如果省略某个字段，该字段必须允许为`NULL`、具有默认值或能够自动生成。例如，`students`表中的`id`会自动递增，因此插入数据时可以省略。
- 不指定字段名称时，必须按照表中字段的定义顺序为所有字段提供值。为了避免表结构变化导致错误，通常建议明确写出字段名称。
- 一条`INSERT INTO`语句可以插入一条或多条记录。插入多条记录时，每组值之间使用英文逗号分隔。

### 示例

向`students`表中插入一名学生。由于`id`会自动生成，因此只需指定其余字段：

```sql
mysql> INSERT INTO students (name, gender, major, score)
    -> VALUES ('吴桐', '女', '数据科学', 91.50);
Query OK, 1 row affected (0.01 sec)
```

查询刚刚插入的记录：

```sql
mysql> SELECT *
    -> FROM students
    -> WHERE name = '吴桐';
+----+------+--------+----------+-------+
| id | name | gender | major    | score |
+----+------+--------+----------+-------+
|  9 | 吴桐 | 女     | 数据科学 | 91.50 |
+----+------+--------+----------+-------+
1 row in set (0.00 sec)
```

也可以在一条语句中插入多条记录：

```sql
INSERT INTO students (name, gender, major, score)
VALUES
    ('郑凯', '男', '计算机技术', NULL),
    ('何静', '女', '网络安全', 87.00);
```



## SQL UPDATE语句

`UPDATE`语句用于更新表中已存在的记录。

### 语法

```sql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
WHERE condition;
```

### 说明

- `SET`用于指定要修改的字段及其新值，写法为`字段名 = 新值`。
- 同时更新多个字段时，各字段的赋值表达式之间使用英文逗号分隔。
- `WHERE`用于指定要更新的记录。执行更新前，应确认筛选条件能够准确选中目标记录。
- 如果省略`WHERE`子句，表中的所有记录都会被更新，因此执行时要格外谨慎。
- `UPDATE`只能修改表中已经存在的记录，不能用来插入新记录。

### 示例

将`id`为`3`的学生成绩修改为`80.00`：

```sql
mysql> UPDATE students
    -> SET score = 80.00
    -> WHERE id = 3;
Query OK, 1 row affected (0.01 sec)
Rows matched: 1  Changed: 1  Warnings: 0
```

查询修改后的记录：

```sql
mysql> SELECT * FROM students WHERE id = 3;
+----+------+--------+------------+-------+
| id | name | gender | major      | score |
+----+------+--------+------------+-------+
|  3 | 王强 | 男     | 计算机技术 | 80.00 |
+----+------+--------+------------+-------+
1 row in set (0.00 sec)
```

也可以同时修改一条记录的多个字段：

```sql
UPDATE students
SET major = '计算机技术', score = 82.00
WHERE id = 6;
```

如果原本只想修改一名学生的成绩，却忘记编写`WHERE`子句：

```sql
-- 错误示例：所有学生的成绩都会被修改为80.00
UPDATE students
SET score = 80.00;
```

上面的语句不会只修改某一名学生，而是会更新`students`表中的全部记录。正确写法是添加能够准确定位目标记录的条件：

```sql
-- 正确示例：只修改id为3的学生
UPDATE students
SET score = 80.00
WHERE id = 3;
```



## SQL DELETE语句

`DELETE`语句用于删除表中的记录。

### 语法

```sql
DELETE FROM table_name
WHERE condition;
```

### 说明

- `WHERE`用于指定要删除的记录，满足条件的一条或多条记录都会被删除。
- `DELETE`删除的是整条记录，不能只删除某个字段中的值。如果只想清除某个字段的值，可以使用`UPDATE`将其设置为`NULL`，前提是该字段允许为`NULL`。
- 如果省略`WHERE`子句，表中的所有记录都会被删除，因此执行时要格外谨慎。
- `DELETE FROM table_name`只删除表中的数据，表本身及其字段结构仍然保留；`DROP TABLE table_name`则会删除整张表。
- 删除前可以先使用相同的`WHERE`条件执行`SELECT`查询，确认选中的记录是否正确。

### 示例

删除`id`为`8`的学生：

```sql
mysql> DELETE FROM students
    -> WHERE id = 8;
Query OK, 1 row affected (0.01 sec)
```

查询该记录，确认其已经被删除：

```sql
mysql> SELECT * FROM students WHERE id = 8;
Empty set (0.00 sec)
```

如果忘记编写`WHERE`子句，表中的所有记录都会被删除：

```sql
-- 危险示例：删除students表中的全部记录
DELETE FROM students;
```

因此，执行删除操作前，建议先确认相同条件会选中哪些记录：

```sql
SELECT * FROM students WHERE id = 8;

DELETE FROM students WHERE id = 8;
```

