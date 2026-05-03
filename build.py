from neo4j import GraphDatabase

class UnifiedMathKnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def clear_database(self):
        """清空数据库中的所有节点和关系（方便我们重新建树）"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            print("[INFO] Database cleared, ready to write new knowledge tree...")

    def build_unified_graph(self):
        # ==========================================
        # 第一步：创建知识点节点 (按逻辑模块划分)
        # ==========================================
        nodes_query = """
        // --- 1. 代数起点 (Algebra Branch) ---
        MERGE (:KnowledgePoint {id: 'A01', name: '实数与数轴 (Real Numbers & Number Line)', domain: 'Algebra'})
        MERGE (:KnowledgePoint {id: 'A02', name: '代数式与化简 (Algebraic Expressions)', domain: 'Algebra'})
        MERGE (:KnowledgePoint {id: 'A03', name: '一元一次方程 (Linear Equations)', domain: 'Algebra'})
        MERGE (:KnowledgePoint {id: 'A04', name: '二元一次方程组 (Simultaneous Equations)', domain: 'Algebra'})

        // --- 2. 几何起点 (Geometry Branch) ---
        MERGE (:KnowledgePoint {id: 'G01', name: '点、线、角基础 (Points, Lines, Angles)', domain: 'Geometry'})
        MERGE (:KnowledgePoint {id: 'G02', name: '平行线与相交线 (Parallel & Intersecting Lines)', domain: 'Geometry'})
        MERGE (:KnowledgePoint {id: 'G03', name: '三角形性质 (Triangle Properties)', domain: 'Geometry'})
        MERGE (:KnowledgePoint {id: 'G04', name: '勾股定理 (Pythagoras Theorem)', domain: 'Geometry'})

        // --- 3. 核心枢纽：代数与几何的统一 ---
        MERGE (:KnowledgePoint {id: 'C01', name: '平面直角坐标系 (Cartesian Coordinate System)', domain: 'Analytic Geometry'})
       
        // --- 4. 枢纽后的发展 (Advanced Topics) ---
        MERGE (:KnowledgePoint {id: 'C02', name: '直线方程 y=mx+c (Equation of a Line)', domain: 'Analytic Geometry'})
        MERGE (:KnowledgePoint {id: 'C03', name: '坐标系中的两点距离 (Distance between Two Points)', domain: 'Analytic Geometry'})
        MERGE (:KnowledgePoint {id: 'F01', name: '基础函数图像 (Graphs of Functions)', domain: 'Functions'})
        MERGE (:KnowledgePoint {id: 'S01', name: '散点图与相关性 (Scatter Graphs)', domain: 'Statistics'})
        MERGE (:KnowledgePoint {id: 'V01', name: '平面向量基础 (2D Vectors)', domain: 'Vectors'})
        """
       
        # ==========================================
        # 第二步：定义前置依赖关系 (从基础指向高级，A -> B 表示 B 依赖 A)
        # 这里的逻辑是： target 依赖 from (from 是前置知识)
        # ==========================================
        relationships = [
            # 代数链路的发展
            {"from": "A01", "to": "A02"}, # 数轴/实数 -> 代数式
            {"from": "A02", "to": "A03"}, # 代数式 -> 一元一次方程
            {"from": "A03", "to": "A04"}, # 一元一次方程 -> 二元一次方程组
           
            # 几何链路的发展
            {"from": "G01", "to": "G02"}, # 点线角 -> 平行线
            {"from": "G02", "to": "G03"}, # 平行线 -> 三角形
            {"from": "G03", "to": "G04"}, # 三角形 -> 勾股定理
           
            # 🌟 历史性的会师：直角坐标系的诞生
            {"from": "A01", "to": "C01"}, # 数轴交叉形成坐标系 (代数贡献)
            {"from": "G02", "to": "C01"}, # 互相垂直的线形成坐标系 (几何贡献)

            # 坐标系诞生后的百花齐放
            {"from": "C01", "to": "C02"}, # 坐标系 -> 直线方程
            {"from": "A03", "to": "C02"}, # 解方程能力 -> 直线方程 (求截距等)
           
            {"from": "C01", "to": "C03"}, # 坐标系 -> 两点间距离
            {"from": "G04", "to": "C03"}, # 勾股定理 -> 两点间距离 (距离公式本质是勾股定理)

            {"from": "C02", "to": "F01"}, # 直线方程 -> 函数图像
            {"from": "C01", "to": "S01"}, # 坐标系 -> 散点图 (统计学应用)
            {"from": "C01", "to": "V01"}, # 坐标系 -> 向量 (用坐标表示向量)
            {"from": "G04", "to": "V01"}  # 勾股定理 -> 向量 (求向量的模长)
        ]

        rel_query = """
        UNWIND $rels AS rel
        MATCH (source:KnowledgePoint {id: rel.from})
        MATCH (target:KnowledgePoint {id: rel.to})
        MERGE (source)-[:REQUIRES]->(target)
        """

        with self.driver.session() as session:
            session.run(nodes_query)
            session.run(rel_query, rels=relationships)
            print("[OK] Knowledge tree written to database!")

    def diagnose_student_weakness(self, topic_name):
        """
        追溯前置知识点
        """
        cypher_query = """
        MATCH (target:KnowledgePoint {name: $topic_name})<-[:REQUIRES*1..5]-(pre:KnowledgePoint)
        RETURN DISTINCT pre.name AS prerequisite_name, pre.domain AS domain, pre.id AS id
        ORDER BY pre.id ASC
        """
        with self.driver.session() as session:
            result = session.run(cypher_query, topic_name=topic_name)
           
            print(f"\n🩺 诊断报告：学生在【{topic_name}】遇到困难，建议按以下顺序追溯复习：")
            print("-" * 65)
            count = 0
            for record in result:
                count += 1
                print(f" 🔹 [{record['domain']}] {record['prerequisite_name']} (节点ID: {record['id']})")
           
            if count == 0:
                print("未找到前置知识点，这可能是最基础的章节了。")
            print("-" * 65)

# ==========================================
# 运行测试
# ==========================================
if __name__ == "__main__":
    # Neo4j AuraDB connection
    URI = "neo4j+s://3956166c.databases.neo4j.io"
    USER = "3956166c"
    PASSWORD = "2d85bp6r3mgK8aOg5GXeM0dmgSkB_v0j7t5XJdkp40Y"

    kg = UnifiedMathKnowledgeGraph(URI, USER, PASSWORD)

    try:
        # 0. 清空旧数据
        kg.clear_database()

        # 1. 构建新的大一统图谱
        kg.build_unified_graph()

        print("\n[OK] Knowledge tree built successfully!")

    finally:
        kg.close()