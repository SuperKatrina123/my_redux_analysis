/*
    bindActionCreator函数：
        将一个或多个action和dispatch组合起来生成`mapDispatchToProps`需要生成的内容
        connect(mapStateToProps, mapDispatchToProps)(UI component)  connect用以从UI组件生成容器组件
        mapStateToProps：将state映射到UI组件的参数（props）
        mapDispatchToProps：将用户对UI组件的操作映射成Action

*/

function bindActionCreator(actionCreator, dispatch) {
    return function() {
       /*
           apply修改this指向
       */
      return dispatch(actionCreator.apply(this, arguments))
    }
  }
  
  export default function bindActionCreators(actionCreators, dispatch) {
    // 参数校验
    /*
      如果actionCreators是一个函数，那么就需要bindActionCreator进行一些处理
      并且看到bindActionCreator返回的是一个函数
      
      如果actionCreators不是一个object（排除null），报错！
    */
    if (typeof actionCreators === 'function') {
      return bindActionCreator(actionCreators, dispatch)
    }
  
    if (typeof actionCreators !== 'object' || actionCreators === null) {
      throw new Error(
        `bindActionCreators expected an object or a function, instead received ${
          actionCreators === null ? 'null' : typeof actionCreators
        }. ` +
          `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
      )
    }
  
    // 维护一个参数boundActionCreators是一个对象，初始为空对象
    const boundActionCreators = {}
    
    /*
        遍历actionCreators，如果actionCreator是一个函数，bindActionCreator后返回一个函数
        最终返回boundActionCreators对象，key为原来的key，value为函数形式
    */
    for (const key in actionCreators) {
      const actionCreator = actionCreators[key]
      if (typeof actionCreator === 'function') {
        boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
      }
    }
    return boundActionCreators
  }