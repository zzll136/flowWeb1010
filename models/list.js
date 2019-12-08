//对list表的操作均写在此文件中
var pool = require('./config');

var DB_NAME = 'flowweb1011';
function User(user) { //创建User对象
    this.username = user.username;
    this.userpass = user.userpass;
};
module.exports = User;

//1用户名单页面，根据四个字段分页获取注册表的用户信息
User.getListMessagebySelect = function getListMessagebySelect(school, year, usertype, status, page, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }

        });
        var getListMessage_Sql = "select * from list where 1=1";
        var a = [];
        if (school != -1) { getListMessage_Sql += " and school=?"; a.push(school); }
        if (year != -1) { getListMessage_Sql += " and year=?"; a.push(year); }
        if (usertype != -1) { getListMessage_Sql += " and usertype=?"; a.push(usertype); }
        if (status != -1) { getListMessage_Sql += " and state=?"; a.push(status); }
        getListMessage_Sql += " order by field(usertype,'管理员','老师','学生') limit " + Number(page - 1) * 15 + ",15";

        var getCount_sql = "select count(1) as num from list where 1=1";
        var b = [];
        if (school != -1) { getCount_sql += " and school=?"; b.push(school); }
        if (year != -1) { getCount_sql += " and year=?"; b.push(year); }
        if (usertype != -1) { getCount_sql += " and usertype=?"; b.push(usertype); }
        if (status != -1) { getCount_sql += " and state=?"; b.push(status); }

        connection.query(getListMessage_Sql, a, function (err, result) {
            if (err) {
                console.log("in manager table -- getListMessagebyReg_Sql Error: " + err.message);
                callback(err, null);
            }
            connection.query(getCount_sql, b, function (err, results) {
                if (err) {
                    console.log("in manager table -- getListMessagebyReg_Sql Error: " + err.message);
                    callback(err, null);
                }
                if (result.length) result[0].count = results[0].num;
                if (!connection.isRelease) {
                    connection.release();
                }
                console.log("list invoked[getListMessagebySelect]");
                callback(err, result);
            });
        });
    });
};

//2根据学校,用户类型和实验批次获取名单，用于检测用户名单是否有重复
User.getListMessageAll = function getListMessageAll(school, userType, year, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        var getList_sql = "select * from list where school=? and usertype=? and year=?";
        connection.query(getList_sql, [school, userType, year], function (err, result) {
            if (err) {
                console.log("in list table -- getList_sql_Sql Error: " + err.message);
                callback(err, null);
            }
            if (!connection.isRelease) {
                connection.release();
            }
            console.log("list invoked[getListMessageAll]");
            callback(err, result);
        });
    });
};

//3录入用户名单的信息表，并把重修的人的数据表放入exper表中，把重修的人的注册状态均改变一下
User.saveListMessage = function saveListMessage(listfrom, school, usertype, year, classname, username, name, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        var values = [];
        for (var i = 0; i < name.length; i++) {
            if (name[i] && username[i]) {
                var value = [];
                value.push(listfrom, school, usertype, year, classname, name[i], username[i], 0);
                values.push(value);
            }
        }
        //看下录入的名单里有多少学号已经在userinfo中存在
        var repeat_sql = "select b.* from userinfo as b left join list as a on a.username=b.username\
        and a.school=b.school where a.usertype='学生' and a.username in(?) and a.school=?;"
        connection.query(repeat_sql, [username, school], function (err, results) {
            if (err) {
                console.log("in list table -- repeat_sql Error: " + err.message);
                callback(err, null);
            }
            if (results.length) {//表示有重复名单
                var userNames = [];
                var schools = [];
                var userIds = [];
                for (var i = 0; i < results.length; i++) {
                    userNames.push(results[i].userName);
                    schools.push(results[i].school);
                    userIds.push(results[i].id);
                }
                var judgeExp_sql = "select * from experiment where year=? and user_id in(?) and courseid=0";
                connection.query(judgeExp_sql, [year, userIds], function (err, result1) {
                    if (err) {
                        console.log("in list table -- repeat_sql Error: " + err.message);
                        callback(err, null);
                    }
                    var result1Id = [];
                    for (var i = 0; i < result1.length; i++) {
                        result1Id.push(result1[i].user_id);
                    }
                    var datas = [];
                    for (var i = 0; i < userIds.length; i++) {
                        if (result1Id.indexOf(userIds[i]) == -1) {//等于-1表示result1Id数组中没有该userIds[i]这个元素，表示可以插入
                            for (var j = 0; j < 9; j++) {
                                var data = [];//这个data必须是个局部变量，每次都要录入一组新数据进行刷新
                                data.push(results[i].id, year, j, 0, 0);
                                datas.push(data);
                            }
                        }
                    }
                    if (datas.length) {//表示重复名单里有用户在exper表中没有数据，需要插入数据
                        var insertExp_sql = "Insert into experiment(user_id,year,courseID,status,score) values ?";
                        connection.query(insertExp_sql, [datas], function (err, resultss) {
                            if (err) {
                                console.log("in list table -- insertExp_sql Error: " + err.message);
                                callback(err, null);
                            }
                            var saveListMessage_Sql = "insert into list(list_from,school,usertype,year,classname,name,userName,state) values ?";
                            connection.query(saveListMessage_Sql, [values], function (err, result) {
                                if (err) {
                                    console.log("in list table -- saveListMessage_Sql Error: " + err.message);
                                    callback(err, null);
                                }
                                var setState_Sql = "update list set state=1 where userName in(?) and school in(?)";
                                connection.query(setState_Sql, [userNames, schools], function (err, result) {
                                    if (err) {
                                        console.log("in list table -- saveListMessage_Sql Error: " + err.message);
                                        callback(err, null);
                                    }
                                    if (!connection.isRelease) {
                                        connection.release();
                                    }
                                    console.log("list invoked[saveListMessage]");
                                    callback(err, result);
                                });
                            });
                        });
                    } else {
                        var saveListMessage_Sql = "insert into list(list_from,school,usertype,year,classname,name,userName,state) values ?";
                        connection.query(saveListMessage_Sql, [values], function (err, result) {
                            if (err) {
                                console.log("in list table -- saveListMessage_Sql Error: " + err.message);
                                callback(err, null);
                            }
                            var setState_Sql = "update list set state=1 where userName in(?) and school in(?)";
                            connection.query(setState_Sql, [userNames, schools], function (err, result) {
                                if (err) {
                                    console.log("in list table -- saveListMessage_Sql Error: " + err.message);
                                    callback(err, null);
                                }
                                if (!connection.isRelease) {
                                    connection.release();
                                }
                                console.log("list invoked[saveListMessage]");
                                callback(err, result);
                            });
                        });
                    }
                });
            }
            else {
                var saveListMessage_Sql = "insert into list(list_from,school,usertype,year,classname,name,userName,state) values ?";
                connection.query(saveListMessage_Sql, [values], function (err, result) {
                    if (err) {
                        console.log("in list table -- saveListMessage_Sql Error: " + err.message);
                        callback(err, null);
                    }
                    if (!connection.isRelease) {
                        connection.release();
                    }
                    console.log("list invoked[saveListMessage]");
                    callback(err, result);
                });
            }
            //该句可以把数据库这张表上，username和school两个字段均重复的 选出来。
            // var repeat_sql = "select a.username,a.school,b.id from list as a left join userinfo as b on a.username=b.username\
            // and a.school=b.school where usertype='学生' group by a.username,a.school having (count(a.username)>1) and (count(a.school)>1);"
        });
    });
};

//4删除用户名单的信息表
User.deListMessage = function deListMessage(id, callback) {
    pool.getConnection(function (err, connection) {
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        // var repeat_sql = "select a.year,b.* from userinfo as b left join list as a on a.username=b.username\
        // and a.school=b.school where a.usertype='学生' and a.id=?";//判断是否是老客户
        // connection.query(repeat_sql, [id], function (err, result) {
        //     if (err) {
        //         console.log("in list table -- repeat_sql Error: " + err.message);
        //         callback(err, null);
        //     }
        //     if(results.length){
        //         var deleteExp_sql="delete from experiment
        //     }
        var deListMessage_Sql = "delete from list where id=?";
        connection.query(deListMessage_Sql, [id], function (err, result) {
            if (err) {
                console.log("in list table -- deListMessage_Sql Error: " + err.message);
                callback(err, null);
            }
            // if (usertype == "管理员") var deinfo_Sql = "delete from managerinfo where userName=? and school=?";
            // else if (usertype == "学生") var deinfo_Sql = "delete from userinfo where userName=? and school=?";
            // else var deinfo_Sql = "delete from teacherinfo where userName=? and school=?";

            // connection.query(deinfo_Sql, [username, school], function (err, results) {
            //     if (err) {
            //         console.log("in list table -- deListMessage_Sql Error: " + err.message);
            //         callback(err, null);
            //     }
            if (!connection.isRelease) {
                connection.release();
            }
            console.log("list invoked[deListMessage]");
            callback(err, result);
            // });
        });
    });
};

//5判断用户有无注册权限，获取的是用户名单里有没有他 最新的批次名单的姓名和list_id信息
User.judgeList = function judgeList(school, usertype, username, callback) {
    pool.getConnection(function (err, connection) {
        var judgeList_Sql = "select count(1) as num,list.name,list.year,list.id from list left join expTime on list.year=expTime.year where school=? and usertype=? and userName= ? order by expTime.startDate desc";
        var useDbSql = "USE " + DB_NAME;
        connection.query(useDbSql, function (err) { //使用回调函数的参数connection来查询数据库
            if (err) {
                console.log("USE Error: " + err.message);
                return;
            }
        });
        connection.query(judgeList_Sql, [school, usertype, username], function (err, result) {
            if (err) {
                console.log("in manager table -- judgeList_Sql Error: " + err.message);
                callback(err, null);
            }

            if (!connection.isRelease) {
                connection.release();
            }
            console.log("list invoked[judgeList]");
            callback(err, result);
        });
    });
};
